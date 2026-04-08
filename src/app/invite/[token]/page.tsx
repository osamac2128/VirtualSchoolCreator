'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

type InviteState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string }
  | { status: 'valid'; email: string; name: string; role: string; schoolName: string }
  | { status: 'success' }

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)

  const [inviteState, setInviteState] = useState<InviteState>({ status: 'loading' })
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInviteState({
            status: 'valid',
            email: data.email,
            name: data.name,
            role: data.role,
            schoolName: data.schoolName,
          })
        } else {
          setInviteState({
            status: 'invalid',
            message: data.error ?? 'This invite link is invalid or has expired.',
          })
        }
      })
      .catch(() => {
        setInviteState({
          status: 'invalid',
          message: 'Unable to validate invite. Please try again.',
        })
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inviteState.status !== 'valid') return

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: inviteState.email,
        password,
      })

      if (signUpError) throw signUpError
      if (!data.user) throw new Error('Sign up failed. Please try again.')

      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseId: data.user.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to activate account.')
      }

      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleLabel = (role: string) =>
    role.charAt(0) + role.slice(1).toLowerCase()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-lg font-semibold text-foreground">Virtual School Creator</span>
        </div>

        {inviteState.status === 'loading' && (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Validating your invite...</p>
          </div>
        )}

        {inviteState.status === 'invalid' && (
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">Invalid Invite</h1>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              {inviteState.message || 'This invite link is invalid or has expired.'}
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Go to login
            </Link>
          </div>
        )}

        {inviteState.status === 'valid' && (
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">You're invited!</h1>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              You've been invited to{' '}
              <span className="font-medium text-foreground">{inviteState.schoolName}</span> as a{' '}
              <span className="font-medium text-foreground">
                {roleLabel(inviteState.role)}
              </span>
              . Complete your registration to get started.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  value={inviteState.name}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteState.email}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Choose a password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
