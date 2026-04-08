'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RoleBadge } from '@/components/RoleBadge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Mail, ExternalLink, Loader2 } from 'lucide-react'

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'

interface Props {
  user: {
    id: string
    name: string
    email: string
    role: string
    active: boolean
    createdAt: string
  }
  isCurrentUser: boolean
}

const CHANGEABLE_ROLES: UserRole[] = ['TEACHER', 'STUDENT', 'PARENT']

export function UserManagementRow({ user, isCurrentUser }: Props) {
  const router = useRouter()

  const [roleLoading, setRoleLoading] = useState(false)
  const [activeLoading, setActiveLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRoleChange(newRole: UserRole) {
    if (isCurrentUser || newRole === user.role) return
    setRoleLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update role')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRoleLoading(false)
    }
  }

  async function handleToggleActive() {
    if (isCurrentUser) return
    setActiveLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update status')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActiveLoading(false)
    }
  }

  async function handleResetPassword() {
    if (isCurrentUser) return
    setResetLoading(true)
    setError(null)
    setResetSent(false)
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send reset email')
      setResetSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setResetLoading(false)
    }
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      {/* Avatar */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Mail className="h-3 w-3" /> {user.email}
        </p>
      </div>

      {/* Role badge */}
      <div className="flex-shrink-0">
        <RoleBadge role={user.role as UserRole} />
      </div>

      {/* Active status badge */}
      <span
        className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
          user.active
            ? 'bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400'
            : 'bg-destructive/10 text-destructive ring-destructive/20'
        }`}
      >
        {user.active ? 'Active' : 'Inactive'}
      </span>

      {/* Join date */}
      <p className="hidden flex-shrink-0 text-xs text-muted-foreground sm:block">
        Joined {new Date(user.createdAt).toLocaleDateString()}
      </p>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Role dropdown — not shown for ADMIN users */}
        {!isAdmin && (
          <div className="relative">
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              disabled={isCurrentUser || roleLoading}
              className="h-8 rounded-lg border border-border bg-background px-2 pr-6 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 appearance-none"
              aria-label="Change role"
            >
              {CHANGEABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            {roleLoading && (
              <Loader2 className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {/* Activate / Deactivate */}
        {!isAdmin && (
          <button
            onClick={handleToggleActive}
            disabled={isCurrentUser || activeLoading}
            className={buttonVariants({
              variant: user.active ? 'destructive' : 'outline',
              size: 'sm',
            })}
          >
            {activeLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : user.active ? (
              'Deactivate'
            ) : (
              'Activate'
            )}
          </button>
        )}

        {/* Reset password */}
        {!isAdmin && (
          <button
            onClick={handleResetPassword}
            disabled={isCurrentUser || resetLoading || resetSent}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {resetLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : resetSent ? (
              'Email sent'
            ) : (
              'Reset Password'
            )}
          </button>
        )}

        {/* View details */}
        <Link
          href={`/dashboard/admin/users/${user.id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          title="View details / Link parent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Details</span>
        </Link>
      </div>

      {/* Inline error */}
      {error && (
        <p className="w-full pl-12 text-xs text-destructive">{error}</p>
      )}
    </li>
  )
}
