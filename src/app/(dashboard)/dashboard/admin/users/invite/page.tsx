'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
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
import { AlertCircle, CheckCircle, Send } from 'lucide-react'

type Role = 'TEACHER' | 'STUDENT' | 'PARENT'

const ROLES: { value: Role; label: string }[] = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
]

export default function InviteUserPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

  function reset() {
    setName('')
    setEmail('')
    setRole('')
    setError(null)
    setSuccessEmail(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) {
      setError('Please select a role.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to send invite.')
      }

      setSuccessEmail(data.invite.email)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successEmail) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Invite User"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard/admin' },
            { label: 'Users', href: '/dashboard/admin/users' },
          ]}
        />
        <div className="max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-completed)]/10">
              <CheckCircle className="h-5 w-5 text-[var(--status-completed)]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Invite sent!</h2>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            An invite email has been sent to{' '}
            <span className="font-medium text-foreground">{successEmail}</span>. The link will
            expire in 7 days.
          </p>
          <Button variant="outline" onClick={reset}>
            Send Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invite User"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Users', href: '/dashboard/admin/users' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="jane@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Sending...' : 'Send Invite'}
        </Button>
      </form>
    </div>
  )
}
