'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE'

interface AnswerData {
  id: string
  text: string
  isCorrect: boolean
}

interface QuestionData {
  id: string
  text: string
  type: QuestionType
  order: number
  answers: AnswerData[]
}

interface QuizData {
  id: string
  title: string
  questions: QuestionData[]
}

interface Props {
  lessonId: string
  lessonTitle: string
  existingQuiz: QuizData | null
  onQuizDeleted?: () => void
}

// ---------------------------------------------------------------------------
// Draft shapes — ids are optional (absent for new items, present for existing)
// ---------------------------------------------------------------------------

interface DraftAnswer {
  /** Absent for brand-new answers not yet in the DB */
  id?: string
  /** Stable React key — the DB id for existing answers, a temp uid for new ones */
  _key: string
  text: string
  isCorrect: boolean
}

interface DraftQuestion {
  /** Absent for brand-new questions not yet in the DB */
  id?: string
  /** Stable React key */
  _key: string
  text: string
  type: QuestionType
  answers: DraftAnswer[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0
function uid() {
  return `_new_${++_seq}`
}

function makeDefaultAnswers(type: QuestionType): DraftAnswer[] {
  if (type === 'TRUE_FALSE') {
    return [
      { _key: uid(), text: 'True', isCorrect: true },
      { _key: uid(), text: 'False', isCorrect: false },
    ]
  }
  return [
    { _key: uid(), text: '', isCorrect: true },
    { _key: uid(), text: '', isCorrect: false },
  ]
}

function makeQuestion(): DraftQuestion {
  return {
    _key: uid(),
    text: '',
    type: 'MULTIPLE_CHOICE',
    answers: makeDefaultAnswers('MULTIPLE_CHOICE'),
  }
}

function fromExistingQuestion(q: QuestionData): DraftQuestion {
  return {
    id: q.id,
    _key: q.id,
    text: q.text,
    type: q.type,
    answers: q.answers.map((a) => ({
      id: a.id,
      _key: a.id,
      text: a.text,
      isCorrect: a.isCorrect,
    })),
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuizBuilder({ lessonId, lessonTitle, existingQuiz, onQuizDeleted }: Props) {
  const router = useRouter()
  const isUpdate = existingQuiz !== null

  const [quizTitle, setQuizTitle] = useState<string>(
    existingQuiz?.title ?? lessonTitle,
  )
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => {
    if (existingQuiz && existingQuiz.questions.length > 0) {
      return existingQuiz.questions.map(fromExistingQuestion)
    }
    return [makeQuestion()]
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // -------------------------------------------------------------------------
  // Question mutations
  // -------------------------------------------------------------------------

  function addQuestion() {
    setQuestions((prev) => [...prev, makeQuestion()])
    setSuccess(false)
  }

  function removeQuestion(key: string) {
    setQuestions((prev) => prev.filter((q) => q._key !== key))
    setSuccess(false)
  }

  function updateQuestion(key: string, patch: Partial<Omit<DraftQuestion, '_key' | 'id'>>) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== key) return q
        const updated = { ...q, ...patch }
        // When changing type, reset answers (new items — no DB ids)
        if (patch.type && patch.type !== q.type) {
          updated.answers = makeDefaultAnswers(patch.type)
        }
        return updated
      }),
    )
    setSuccess(false)
  }

  // -------------------------------------------------------------------------
  // Answer mutations
  // -------------------------------------------------------------------------

  function addAnswer(questionKey: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== questionKey) return q
        if (q.answers.length >= 4) return q
        return {
          ...q,
          answers: [...q.answers, { _key: uid(), text: '', isCorrect: false }],
        }
      }),
    )
    setSuccess(false)
  }

  function removeAnswer(questionKey: string, answerKey: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== questionKey) return q
        const filtered = q.answers.filter((a) => a._key !== answerKey)
        // Ensure at least one correct after removal
        const hasCorrect = filtered.some((a) => a.isCorrect)
        const fixed = hasCorrect
          ? filtered
          : filtered.map((a, i) => (i === 0 ? { ...a, isCorrect: true } : a))
        return { ...q, answers: fixed }
      }),
    )
    setSuccess(false)
  }

  function updateAnswerText(questionKey: string, answerKey: string, text: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== questionKey) return q
        return {
          ...q,
          answers: q.answers.map((a) =>
            a._key === answerKey ? { ...a, text } : a,
          ),
        }
      }),
    )
    setSuccess(false)
  }

  function setCorrectAnswer(questionKey: string, answerKey: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== questionKey) return q
        return {
          ...q,
          answers: q.answers.map((a) => ({
            ...a,
            isCorrect: a._key === answerKey,
          })),
        }
      }),
    )
    setSuccess(false)
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  function validate(): string | null {
    if (!quizTitle.trim()) return 'Quiz title is required.'
    if (questions.length === 0) return 'Add at least one question.'
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Question ${i + 1} text is required.`
      if (q.answers.length < 2) return `Question ${i + 1} needs at least 2 answers.`
      const hasCorrect = q.answers.some((a) => a.isCorrect)
      if (!hasCorrect) return `Question ${i + 1} must have at least one correct answer.`
      for (let j = 0; j < q.answers.length; j++) {
        if (!q.answers[j].text.trim()) {
          return `Question ${i + 1}, answer ${j + 1} text is required.`
        }
      }
    }
    return null
  }

  // -------------------------------------------------------------------------
  // Save (create or update)
  // -------------------------------------------------------------------------

  async function handleSave() {
    setError(null)
    setSuccess(false)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    try {
      let res: Response

      if (isUpdate) {
        // PATCH — update existing quiz
        const payload = {
          title: quizTitle.trim(),
          questions: questions.map((q, idx) => ({
            // Only include id when it refers to an existing DB record
            ...(q.id ? { id: q.id } : {}),
            text: q.text.trim(),
            type: q.type,
            order: idx + 1,
            answers: q.answers.map((a) => ({
              ...(a.id ? { id: a.id } : {}),
              text: a.text.trim(),
              isCorrect: a.isCorrect,
            })),
          })),
        }

        res = await fetch(`/api/quizzes/${existingQuiz.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // POST — create new quiz
        const payload = {
          lessonId,
          title: quizTitle.trim(),
          questions: questions.map((q, idx) => ({
            text: q.text.trim(),
            type: q.type,
            order: idx + 1,
            answers: q.answers.map((a) => ({
              text: a.text.trim(),
              isCorrect: a.isCorrect,
            })),
          })),
        }

        res = await fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong.')
        return
      }

      setSuccess(true)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------------------
  // Delete quiz
  // -------------------------------------------------------------------------

  async function handleDelete() {
    if (!existingQuiz) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quizzes/${existingQuiz.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Delete failed.')
        setDeleteConfirm(false)
        return
      }
      setDeleteConfirm(false)
      if (onQuizDeleted) {
        onQuizDeleted()
      } else {
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Quiz title */}
      <div className="space-y-1.5">
        <Label htmlFor="quiz-title" className="text-sm font-medium">
          Quiz Title
        </Label>
        <Input
          id="quiz-title"
          value={quizTitle}
          onChange={(e) => {
            setQuizTitle(e.target.value)
            setSuccess(false)
          }}
          placeholder="e.g. Week 3 Comprehension Quiz"
          disabled={busy}
          className="max-w-lg"
        />
      </div>

      {/* Question list */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => (
          <QuestionCard
            key={q._key}
            question={q}
            index={qIdx}
            disabled={busy}
            onUpdateQuestion={(patch) => updateQuestion(q._key, patch)}
            onRemoveQuestion={() => removeQuestion(q._key)}
            onAddAnswer={() => addAnswer(q._key)}
            onRemoveAnswer={(aKey) => removeAnswer(q._key, aKey)}
            onUpdateAnswerText={(aKey, text) => updateAnswerText(q._key, aKey, text)}
            onSetCorrect={(aKey) => setCorrectAnswer(q._key, aKey)}
          />
        ))}
      </div>

      {/* Add question */}
      <Button
        variant="outline"
        size="sm"
        onClick={addQuestion}
        disabled={busy}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Question
      </Button>

      {/* Error / success */}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Quiz saved successfully.
        </p>
      )}

      {/* Action row */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={busy}>
          {busy ? 'Saving…' : isUpdate ? 'Save Changes' : 'Save Quiz'}
        </Button>

        {/* Delete — only shown in edit mode */}
        {isUpdate && (
          <>
            {deleteConfirm ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Delete this quiz?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="rounded bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  {busy ? 'Deleting…' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleteConfirm(false)}
                  className="rounded px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Quiz
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// QuestionCard sub-component
// ---------------------------------------------------------------------------

interface QuestionCardProps {
  question: DraftQuestion
  index: number
  disabled: boolean
  onUpdateQuestion: (patch: Partial<Omit<DraftQuestion, '_key' | 'id'>>) => void
  onRemoveQuestion: () => void
  onAddAnswer: () => void
  onRemoveAnswer: (answerKey: string) => void
  onUpdateAnswerText: (answerKey: string, text: string) => void
  onSetCorrect: (answerKey: string) => void
}

function QuestionCard({
  question,
  index,
  disabled,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddAnswer,
  onRemoveAnswer,
  onUpdateAnswerText,
  onSetCorrect,
}: QuestionCardProps) {
  const isTrueFalse = question.type === 'TRUE_FALSE'
  const canAddAnswer = !isTrueFalse && question.answers.length < 4

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Q{index + 1}
          </CardTitle>
          <button
            type="button"
            aria-label="Remove question"
            disabled={disabled}
            onClick={onRemoveQuestion}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Question text */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`q-text-${question._key}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Question
          </Label>
          <Input
            id={`q-text-${question._key}`}
            value={question.text}
            onChange={(e) => onUpdateQuestion({ text: e.target.value })}
            placeholder="Enter question text…"
            disabled={disabled}
          />
        </div>

        {/* Question type */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`q-type-${question._key}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Type
          </Label>
          <Select
            value={question.type}
            onValueChange={(val) =>
              onUpdateQuestion({ type: val as QuestionType })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`q-type-${question._key}`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
              <SelectItem value="TRUE_FALSE">True / False</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Answers */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Answers
            {!isTrueFalse && (
              <span className="ml-1 normal-case font-normal">
                (select the correct one)
              </span>
            )}
          </p>

          <div className="space-y-2">
            {question.answers.map((answer, aIdx) => (
              <div key={answer._key} className="flex items-center gap-2">
                {/* Correct radio */}
                <input
                  type="radio"
                  name={`correct-${question._key}`}
                  id={`answer-${answer._key}`}
                  checked={answer.isCorrect}
                  onChange={() => onSetCorrect(answer._key)}
                  disabled={disabled}
                  className="h-3.5 w-3.5 shrink-0 accent-primary"
                  aria-label={`Mark answer ${aIdx + 1} as correct`}
                />

                {/* Answer text */}
                {isTrueFalse ? (
                  <label
                    htmlFor={`answer-${answer._key}`}
                    className="text-sm text-foreground select-none"
                  >
                    {answer.text}
                  </label>
                ) : (
                  <Input
                    value={answer.text}
                    onChange={(e) => onUpdateAnswerText(answer._key, e.target.value)}
                    placeholder={`Answer ${aIdx + 1}`}
                    disabled={disabled}
                    aria-label={`Answer ${aIdx + 1} text`}
                  />
                )}

                {/* Remove answer (MC only, keep minimum 2) */}
                {!isTrueFalse && question.answers.length > 2 && (
                  <button
                    type="button"
                    aria-label="Remove answer"
                    disabled={disabled}
                    onClick={() => onRemoveAnswer(answer._key)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:pointer-events-none disabled:opacity-50 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add answer (MC only, max 4) */}
          {canAddAnswer && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddAnswer}
              disabled={disabled}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add Answer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
