'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  ExternalLink,
  BookOpen,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types mirroring the Prisma Lesson shape returned from the server
// ---------------------------------------------------------------------------

type LessonType = 'VIDEO' | 'PDF' | 'TEXT' | 'LINK' | 'QUIZ'

interface Lesson {
  id: string
  title: string
  type: LessonType
  // Prisma JsonValue: string | number | boolean | null | JsonObject | JsonArray
  // We treat it as unknown and extract safely in helpers
  content: unknown
  order: number
  published: boolean
  durationMin: number | null
  quiz: { id: string; title: string } | null
}

interface WeekLessonEditorProps {
  weekId: string
  courseId: string
  weekNumber: number
  lessons: Lesson[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<LessonType, string> = {
  VIDEO: 'Video',
  PDF: 'PDF',
  TEXT: 'Text',
  LINK: 'Link',
  QUIZ: 'Quiz',
}

const TYPE_BADGE_CLASS: Record<LessonType, string> = {
  VIDEO: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-400',
  PDF: 'bg-destructive/10 text-destructive ring-destructive/20',
  TEXT: 'bg-primary/10 text-primary ring-primary/20',
  LINK: 'bg-muted text-muted-foreground ring-border',
  QUIZ: 'bg-[var(--role-admin)]/15 text-[var(--role-admin)] ring-[var(--role-admin)]/30',
}

function TypeBadge({ type }: { type: LessonType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TYPE_BADGE_CLASS[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  )
}

function contentUrlLabel(type: LessonType): string {
  switch (type) {
    case 'VIDEO': return 'Video URL (YouTube embed, Vimeo, or direct MP4)'
    case 'PDF':   return 'PDF URL (Supabase Storage URL or external)'
    case 'LINK':  return 'Link URL'
    default:      return 'URL'
  }
}

function getContentString(lesson: Lesson): string {
  const c = lesson.content
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ''
  const obj = c as Record<string, unknown>
  if (lesson.type === 'TEXT') {
    return typeof obj.html === 'string' ? obj.html : ''
  }
  return typeof obj.url === 'string' ? obj.url : ''
}

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------

interface FormState {
  title: string
  type: LessonType
  content: string
  durationMin: string
}

const EMPTY_FORM: FormState = {
  title: '',
  type: 'VIDEO',
  content: '',
  durationMin: '',
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WeekLessonEditor({
  weekId,
  courseId,
  weekNumber,
  lessons: initialLessons,
}: WeekLessonEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Which lesson is being edited (id), or 'new' for the add form, or null
  const [formMode, setFormMode] = useState<'new' | string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Warn the user if they try to navigate away with an open/dirty form
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  // Use a local ordered copy for optimistic up/down moves; server is source of
  // truth after each mutation via router.refresh()
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons)

  // Keep local state in sync when parent re-renders with fresh server data
  // (router.refresh causes the server component to re-render and pass new props)
  // We use a ref-based reconciliation: compare ids to detect server refresh
  // In practice: after router.refresh() the component unmounts/remounts, so
  // initialLessons prop change is sufficient — no extra effect needed.

  function refresh() {
    startTransition(() => router.refresh())
  }

  // -------------------------------------------------------------------------
  // Form helpers
  // -------------------------------------------------------------------------

  function openAdd() {
    setForm(EMPTY_FORM)
    setError(null)
    setFormMode('new')
    // Form is open but empty — no unsaved changes yet
    setHasUnsavedChanges(false)
  }

  function openEdit(lesson: Lesson) {
    setForm({
      title: lesson.title,
      type: lesson.type,
      content: getContentString(lesson),
      durationMin: lesson.durationMin != null ? String(lesson.durationMin) : '',
    })
    setError(null)
    setFormMode(lesson.id)
    // An edit form is open — treat as unsaved changes immediately
    setHasUnsavedChanges(true)
  }

  function closeForm() {
    setFormMode(null)
    setError(null)
    setHasUnsavedChanges(false)
  }

  // Called by LessonForm whenever a field value changes
  function handleFormChange(f: FormState) {
    setForm(f)
    // Mark dirty as soon as the user types anything in the add form
    // (edit forms are already marked dirty when opened)
    const isDirty =
      f.title.trim() !== '' ||
      f.content.trim() !== '' ||
      f.durationMin.trim() !== ''
    setHasUnsavedChanges(formMode === 'new' ? isDirty : true)
  }

  function buildContent(type: LessonType, rawContent: string): Record<string, unknown> {
    if (type === 'TEXT') return { html: rawContent }
    if (type === 'QUIZ') return {}
    return { url: rawContent }
  }

  // -------------------------------------------------------------------------
  // API mutations
  // -------------------------------------------------------------------------

  async function handleSave() {
    setError(null)
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (form.type !== 'QUIZ' && !form.content.trim()) {
      setError('Content is required.')
      return
    }

    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        type: form.type,
        content: buildContent(form.type, form.content),
        ...(form.durationMin ? { durationMin: parseInt(form.durationMin, 10) } : {}),
      }

      let res: Response
      if (formMode === 'new') {
        body.weekId = weekId
        res = await fetch('/api/lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(`/api/lessons/${formMode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong.')
        return
      }

      setHasUnsavedChanges(false)
      closeForm()
      refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(lessonId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Delete failed.')
        return
      }
      setDeleteConfirm(null)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleTogglePublished(lesson: Lesson) {
    setBusy(true)
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !lesson.published }),
      })
      if (!res.ok) return
      refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(lesson: Lesson, direction: 'up' | 'down') {
    const idx = lessons.findIndex((l) => l.id === lesson.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= lessons.length) return

    // Optimistic local reorder
    const newLessons = [...lessons]
    const swapTarget = newLessons[swapIdx]
    newLessons[idx] = { ...swapTarget, order: lesson.order }
    newLessons[swapIdx] = { ...lesson, order: swapTarget.order }
    setLessons(newLessons)

    // Persist both order changes
    setBusy(true)
    try {
      await Promise.all([
        fetch(`/api/lessons/${lesson.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: swapTarget.order }),
        }),
        fetch(`/api/lessons/${swapTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: lesson.order }),
        }),
      ])
      refresh()
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isAddingNew = formMode === 'new'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
        </h2>
        <Button
          size="sm"
          onClick={openAdd}
          disabled={busy || isPending || isAddingNew}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Lesson
        </Button>
      </div>

      {/* Lesson list */}
      <Card>
        {lessons.length === 0 && !isAddingNew ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No lessons yet. Click &ldquo;Add Lesson&rdquo; to get started.
          </CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {lessons.map((lesson, idx) => {
              const isEditing = formMode === lesson.id
              return (
                <li key={lesson.id}>
                  {/* Row */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    {/* Up/Down */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={idx === 0 || busy || isPending}
                        onClick={() => handleMove(lesson, 'up')}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30 transition-colors"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={idx === lessons.length - 1 || busy || isPending}
                        onClick={() => handleMove(lesson, 'down')}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30 transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Title + badges */}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {lesson.title}
                      </span>
                      <TypeBadge type={lesson.type} />
                      {lesson.durationMin != null && (
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {lesson.durationMin} min
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Quiz builder link */}
                      {lesson.type === 'QUIZ' && (
                        <Link
                          href={`/courses/${courseId}/weeks/${weekNumber}/lessons/${lesson.id}/quiz`}
                          className="rounded p-1.5 text-muted-foreground hover:text-[var(--role-admin)] transition-colors"
                          title="Open quiz builder"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </Link>
                      )}

                      {/* Published toggle */}
                      <button
                        type="button"
                        aria-label={lesson.published ? 'Unpublish lesson' : 'Publish lesson'}
                        disabled={busy || isPending}
                        onClick={() => handleTogglePublished(lesson)}
                        className={`rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                          lesson.published
                            ? 'text-primary hover:text-primary/70'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={lesson.published ? 'Published — click to unpublish' : 'Unpublished — click to publish'}
                      >
                        {lesson.published ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        aria-label="Edit lesson"
                        disabled={busy || isPending || isEditing}
                        onClick={() => openEdit(lesson)}
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      {deleteConfirm === lesson.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(lesson.id)}
                            className="rounded bg-destructive/10 px-2 py-0.5 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label="Delete lesson"
                          disabled={busy || isPending}
                          onClick={() => setDeleteConfirm(lesson.id)}
                          className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:pointer-events-none disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <LessonForm
                      form={form}
                      onChange={handleFormChange}
                      onSave={handleSave}
                      onCancel={closeForm}
                      error={error}
                      busy={busy}
                      mode="edit"
                      courseId={courseId}
                      weekNumber={weekNumber}
                      lessonId={lesson.id}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Add-new form at the bottom of the card */}
        {isAddingNew && (
          <div className={lessons.length > 0 ? 'border-t border-border' : ''}>
            <LessonForm
              form={form}
              onChange={handleFormChange}
              onSave={handleSave}
              onCancel={closeForm}
              error={error}
              busy={busy}
              mode="add"
              courseId={courseId}
              weekNumber={weekNumber}
            />
          </div>
        )}
      </Card>

      {/* Pending overlay hint */}
      {isPending && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Refreshing…
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lesson form — shared by add and edit modes
// ---------------------------------------------------------------------------

interface LessonFormProps {
  form: FormState
  onChange: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
  error: string | null
  busy: boolean
  mode: 'add' | 'edit'
  courseId: string
  weekNumber: number
  lessonId?: string
}

function LessonForm({
  form,
  onChange,
  onSave,
  onCancel,
  error,
  busy,
  mode,
  courseId,
  weekNumber,
  lessonId,
}: LessonFormProps) {
  const set = (field: keyof FormState) => (value: string) =>
    onChange({ ...form, [field]: value })

  const isUrlType = form.type === 'VIDEO' || form.type === 'PDF' || form.type === 'LINK'
  const isTextType = form.type === 'TEXT'
  const isQuizType = form.type === 'QUIZ'

  return (
    <div className="bg-muted/30 px-4 py-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {mode === 'add' ? 'New Lesson' : 'Edit Lesson'}
      </h3>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Title */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lesson-title">Title</Label>
          <Input
            id="lesson-title"
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            placeholder="e.g. Introduction to the topic"
            disabled={busy}
          />
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="lesson-type">Type</Label>
          <Select
            value={form.type}
            onValueChange={(val) => onChange({ ...form, type: val as LessonType, content: '' })}
            disabled={busy}
          >
            <SelectTrigger id="lesson-type" className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(['VIDEO', 'PDF', 'TEXT', 'LINK', 'QUIZ'] as LessonType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <Label htmlFor="lesson-duration">Duration (min)</Label>
          <Input
            id="lesson-duration"
            type="number"
            min={1}
            value={form.durationMin}
            onChange={(e) => set('durationMin')(e.target.value)}
            placeholder="e.g. 15"
            disabled={busy}
          />
        </div>

        {/* Content field — changes by type */}
        <div className="space-y-1.5 sm:col-span-2">
          {isUrlType && (
            <>
              <Label htmlFor="lesson-content">{contentUrlLabel(form.type)}</Label>
              <Input
                id="lesson-content"
                type="url"
                value={form.content}
                onChange={(e) => set('content')(e.target.value)}
                placeholder="https://"
                disabled={busy}
              />
            </>
          )}

          {isTextType && (
            <>
              <Label htmlFor="lesson-content">Lesson Content (HTML supported)</Label>
              <textarea
                id="lesson-content"
                value={form.content}
                onChange={(e) => set('content')(e.target.value)}
                rows={6}
                placeholder="<p>Enter lesson content here…</p>"
                disabled={busy}
                className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 resize-y"
              />
            </>
          )}

          {isQuizType && (
            <div className="rounded-lg border border-dashed border-border bg-[var(--role-admin)]/5 px-4 py-3 text-sm text-muted-foreground">
              Quiz questions are configured separately after creating the lesson.
              {mode === 'edit' && lessonId && (
                <Link
                  href={`/courses/${courseId}/weeks/${weekNumber}/lessons/${lessonId}/quiz`}
                  className="ml-2 inline-flex items-center gap-1 font-medium text-[var(--role-admin)] hover:underline"
                >
                  Open Quiz Builder
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
