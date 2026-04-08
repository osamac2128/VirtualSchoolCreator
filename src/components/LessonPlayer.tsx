'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Circle,
  Play,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Answer {
  id: string
  text: string
}

interface Question {
  id: string
  text: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE'
  answers: Answer[]
}

interface QuizData {
  id: string
  title: string
  questions: Question[]
}

export interface LessonItem {
  id: string
  title: string
  type: 'VIDEO' | 'PDF' | 'TEXT' | 'LINK' | 'QUIZ'
  content: unknown
  durationMin: number | null
  quiz: QuizData | null
}

interface Props {
  lessons: LessonItem[]
  lessonProgress: Record<string, string>
  isStudent: boolean
  weekId: string
}

// ─── Quiz result shape returned by the API ───────────────────────────────────

interface QuizResult {
  score: number
  correct: number
  total: number
  results: { questionId: string; correct: boolean; correctAnswerId: string | null }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url: string): string | null {
  if (url.includes('youtube.com/watch')) {
    try {
      const u = new URL(url)
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    } catch {
      // fall through
    }
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]
    if (id) return `https://www.youtube.com/embed/${id}`
  }
  return null
}

function getVimeoEmbedUrl(url: string): string | null {
  if (url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match) return `https://player.vimeo.com/video/${match[1]}`
  }
  return null
}

function contentUrl(content: unknown): string {
  if (content && typeof content === 'object' && 'url' in (content as object)) {
    return String((content as { url: unknown }).url)
  }
  return ''
}

function contentHtml(content: unknown): string {
  if (content && typeof content === 'object' && 'html' in (content as object)) {
    return String((content as { html: unknown }).html)
  }
  return ''
}

// ─── Content renderers ────────────────────────────────────────────────────────

function VideoRenderer({ url }: { url: string }) {
  const ytEmbed = getYouTubeEmbedUrl(url)
  if (ytEmbed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={ytEmbed}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    )
  }

  const vimeoEmbed = getVimeoEmbedUrl(url)
  if (vimeoEmbed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={vimeoEmbed}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video"
        />
      </div>
    )
  }

  return <video controls src={url} className="w-full rounded-lg" />
}

function PdfRenderer({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="w-full h-[600px] rounded-lg border border-border"
      title="PDF Viewer"
    />
  )
}

function TextRenderer({ html }: { html: string }) {
  return (
    <div
      // Content is teacher-authored, stored server-side — not user-supplied
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      className="prose max-w-none"
    />
  )
}

function LinkRenderer({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <ExternalLink className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">This lesson links to an external resource.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: 'default' })}
      >
        Open Link
        <ExternalLink className="ml-1.5 h-4 w-4" />
      </a>
    </div>
  )
}

// ─── Inline quiz ──────────────────────────────────────────────────────────────

interface QuizRendererProps {
  quiz: QuizData
  lessonId: string
  alreadyCompleted: boolean
  onCompleted: () => void
}

function QuizRenderer({ quiz, lessonId, alreadyCompleted, onCompleted }: QuizRendererProps) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [markingComplete, startMarkComplete] = useTransition()
  const router = useRouter()

  const allAnswered = quiz.questions.every((q) => selected[q.id] !== undefined)

  function handleSelect(questionId: string, answerId: string) {
    if (result) return // locked after submission
    setSelected((prev) => ({ ...prev, [questionId]: answerId }))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: selected }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string }).error ?? 'Failed to submit quiz.')
          return
        }
        const data: QuizResult = await res.json()
        setResult(data)
        router.refresh()
      } catch {
        setError('Network error — please try again.')
      }
    })
  }

  function handleMarkComplete() {
    startMarkComplete(async () => {
      try {
        await fetch(`/api/lessons/${lessonId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: result?.score }),
        })
        onCompleted()
        router.refresh()
      } catch {
        // best-effort — progress already saved by quiz submit
      }
    })
  }

  // Build a lookup: questionId → correctAnswerId from results
  const correctMap: Record<string, string | null> = {}
  if (result) {
    for (const r of result.results) {
      correctMap[r.questionId] = r.correctAnswerId
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{quiz.title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-5">
        {quiz.questions.map((question, qi) => (
          <div key={question.id} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">
              {qi + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {question.answers.map((answer) => {
                const isSelected = selected[question.id] === answer.id
                const correct = correctMap[question.id]
                const isCorrectAnswer = result && answer.id === correct
                const isWrongSelected = result && isSelected && !isCorrectAnswer

                return (
                  <button
                    key={answer.id}
                    type="button"
                    onClick={() => handleSelect(question.id, answer.id)}
                    disabled={!!result}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors',
                      result
                        ? isCorrectAnswer
                          ? 'border-[var(--status-completed)] bg-[var(--status-completed)]/10 text-[var(--status-completed)]'
                          : isWrongSelected
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border bg-background text-muted-foreground'
                        : isSelected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background hover:bg-muted text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2',
                        result
                          ? isCorrectAnswer
                            ? 'border-[var(--status-completed)] bg-[var(--status-completed)]'
                            : isWrongSelected
                            ? 'border-destructive bg-destructive'
                            : 'border-muted-foreground'
                          : isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground',
                      )}
                    />
                    {answer.text}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              Score: {Math.round(result.score)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.correct} of {result.total} correct
            </p>
          </div>
          {!alreadyCompleted && (
            <button
              type="button"
              onClick={handleMarkComplete}
              disabled={markingComplete}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              {markingComplete ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              Mark Lesson Complete
            </button>
          )}
        </div>
      )}

      {!result && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !allAnswered}
          className={buttonVariants({ variant: 'default' })}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit Quiz
        </button>
      )}
    </div>
  )
}

// ─── Main LessonPlayer ────────────────────────────────────────────────────────

export function LessonPlayer({ lessons, lessonProgress, isStudent, weekId: _weekId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [localProgress, setLocalProgress] = useState<Record<string, string>>(() => ({
    ...lessonProgress,
  }))
  const [markingComplete, startMarkComplete] = useTransition()
  const router = useRouter()

  const lesson = lessons[currentIndex]
  if (!lesson) return null

  const status = localProgress[lesson.id] ?? 'NOT_STARTED'
  const isCompleted = status === 'COMPLETED'

  function markComplete(lessonId: string) {
    startMarkComplete(async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          setLocalProgress((prev) => ({ ...prev, [lessonId]: 'COMPLETED' }))
          router.refresh()
        }
      } catch {
        // ignore — user can retry
      }
    })
  }

  function handleLessonCompleted(lessonId: string) {
    setLocalProgress((prev) => ({ ...prev, [lessonId]: 'COMPLETED' }))
  }

  const url = contentUrl(lesson.content)
  const html = contentHtml(lesson.content)

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex min-h-[420px]">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-muted/50 p-3 space-y-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lessons
          </p>
          {lessons.map((l, idx) => {
            const s = localProgress[l.id] ?? 'NOT_STARTED'
            const isActive = idx === currentIndex
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors text-left',
                  isActive
                    ? 'bg-background shadow-sm font-medium text-foreground'
                    : 'hover:bg-muted text-muted-foreground',
                )}
              >
                {s === 'COMPLETED' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                ) : s === 'IN_PROGRESS' ? (
                  <Play className="h-4 w-4 flex-shrink-0 text-[var(--status-in-progress)]" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{l.title}</span>
              </button>
            )
          })}
        </aside>

        {/* Content panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{lesson.title}</h2>
              {lesson.durationMin && (
                <p className="text-xs text-muted-foreground mt-0.5">{lesson.durationMin} min</p>
              )}
            </div>
            <span className="ml-3 flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
              {lesson.type}
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-5 py-5">
            {lesson.type === 'VIDEO' && <VideoRenderer url={url} />}
            {lesson.type === 'PDF' && <PdfRenderer url={url} />}
            {lesson.type === 'TEXT' && <TextRenderer html={html} />}
            {lesson.type === 'LINK' && <LinkRenderer url={url} />}
            {lesson.type === 'QUIZ' && lesson.quiz && (
              <QuizRenderer
                quiz={lesson.quiz}
                lessonId={lesson.id}
                alreadyCompleted={isCompleted}
                onCompleted={() => handleLessonCompleted(lesson.id)}
              />
            )}
            {lesson.type === 'QUIZ' && !lesson.quiz && (
              <p className="text-sm text-muted-foreground italic">No quiz data available.</p>
            )}
          </div>

          {/* Footer: mark complete + prev/next */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <div className="flex items-center gap-2">
              {isStudent && lesson.type !== 'QUIZ' && (
                <button
                  type="button"
                  onClick={() => markComplete(lesson.id)}
                  disabled={isCompleted || markingComplete}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isCompleted
                      ? 'bg-[var(--status-completed)]/15 text-[var(--status-completed)] cursor-default'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50',
                  )}
                >
                  {markingComplete ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(lessons.length - 1, i + 1))}
                disabled={currentIndex === lessons.length - 1}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
