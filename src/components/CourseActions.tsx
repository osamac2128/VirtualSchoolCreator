'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CourseActionsProps {
  courseId: string
  courseName: string
  gradeLevel: number
  track: string
}

const VALID_TRACKS = ['STANDARD', 'PREAP', 'AP'] as const

export function CourseActions({ courseId, courseName, gradeLevel, track }: CourseActionsProps) {
  const router = useRouter()

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(courseName)
  const [editGrade, setEditGrade] = useState(String(gradeLevel))
  const [editTrack, setEditTrack] = useState(track)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openEdit() {
    setEditName(courseName)
    setEditGrade(String(gradeLevel))
    setEditTrack(track)
    setEditError(null)
    setEditOpen(true)
    setDeleteOpen(false)
  }

  function openDelete() {
    setDeleteError(null)
    setDeleteOpen(true)
    setEditOpen(false)
  }

  async function handleSave() {
    setEditError(null)
    const trimmedName = editName.trim()
    if (trimmedName.length < 2) {
      setEditError('Name must be at least 2 characters.')
      return
    }
    const grade = Number(editGrade)
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
      setEditError('Grade level must be between 1 and 12.')
      return
    }

    setEditBusy(true)
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, gradeLevel: grade, track: editTrack }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError((data as { error?: string }).error ?? 'Save failed.')
        return
      }
      setEditOpen(false)
      router.refresh()
    } finally {
      setEditBusy(false)
    }
  }

  async function handleDelete() {
    setDeleteError(null)
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError((data as { error?: string }).error ?? 'Delete failed.')
        return
      }
      setDeleteOpen(false)
      router.refresh()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openEdit}
          aria-label="Edit course"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={openDelete}
          aria-label="Delete course"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>

      {/* Inline edit form */}
      {editOpen && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-semibold text-foreground">Edit Course</p>

          {editError && (
            <p role="alert" className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {editError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${courseId}`} className="text-xs">Name</Label>
            <Input
              id={`edit-name-${courseId}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={editBusy}
              className="h-7 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-grade-${courseId}`} className="text-xs">Grade</Label>
              <Input
                id={`edit-grade-${courseId}`}
                type="number"
                min={1}
                max={12}
                value={editGrade}
                onChange={(e) => setEditGrade(e.target.value)}
                disabled={editBusy}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-track-${courseId}`} className="text-xs">Track</Label>
              <Select value={editTrack} onValueChange={(v) => v && setEditTrack(v)} disabled={editBusy}>
                <SelectTrigger id={`edit-track-${courseId}`} className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_TRACKS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t === 'STANDARD' ? 'Standard' : t === 'PREAP' ? 'Pre-AP' : 'AP'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={editBusy} className="h-7 text-xs">
              <Check className="h-3 w-3 mr-1" />
              {editBusy ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editBusy}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <p className="text-xs text-foreground">
            Are you sure you want to delete <strong>{courseName}</strong>? This cannot be undone.
          </p>

          {deleteError && (
            <p role="alert" className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {deleteError}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBusy}
              className="h-7 text-xs"
            >
              {deleteBusy ? 'Deleting...' : 'Yes, Delete'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteBusy}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
