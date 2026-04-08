'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
import { Loader2, X } from 'lucide-react'

interface LinkedUser {
  id: string
  name: string
  email: string
}

interface Props {
  userId: string
  userRole: 'STUDENT' | 'PARENT'
  existingLinks: { id: string; linkedUser: LinkedUser }[]
  availableUsers: { id: string; name: string; email: string }[]
}

export function ParentStudentLinker({ userId, userRole, existingLinks, availableUsers }: Props) {
  const router = useRouter()

  const [selectedId, setSelectedId] = useState('')
  const [linking, setLinking] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLink() {
    if (!selectedId) return
    setLinking(true)
    setError(null)
    try {
      const body =
        userRole === 'STUDENT'
          ? { studentId: userId, parentId: selectedId }
          : { parentId: userId, studentId: selectedId }

      const res = await fetch('/api/parent-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create link')
      setSelectedId('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink(parentStudentId: string) {
    setUnlinkingId(parentStudentId)
    setError(null)
    try {
      const res = await fetch('/api/parent-student', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentStudentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove link')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUnlinkingId(null)
    }
  }

  const linkLabel = userRole === 'STUDENT' ? 'Parent' : 'Student'
  const selectLabel = userRole === 'STUDENT' ? 'Link a Parent' : 'Link a Student'

  return (
    <div className="space-y-4">
      {/* Existing links */}
      {existingLinks.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {existingLinks.map(({ id, linkedUser }) => (
            <li key={id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {linkedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{linkedUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">{linkedUser.email}</p>
              </div>
              <button
                onClick={() => handleUnlink(id)}
                disabled={unlinkingId === id}
                className={buttonVariants({ variant: 'destructive', size: 'icon-sm' })}
                aria-label={`Remove link to ${linkedUser.name}`}
              >
                {unlinkingId === id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No {linkLabel.toLowerCase()}s linked yet.</p>
      )}

      {/* Add link form */}
      {availableUsers.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="link-user-select"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {selectLabel}
            </label>
            <select
              id="link-user-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a {linkLabel.toLowerCase()}...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLink}
            disabled={!selectedId || linking}
            className={buttonVariants({ variant: 'default', size: 'default' })}
          >
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link'}
          </button>
        </div>
      )}

      {availableUsers.length === 0 && existingLinks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          All available {linkLabel.toLowerCase()}s are already linked.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
