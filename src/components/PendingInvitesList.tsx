'use client'

import { useEffect, useState, useCallback } from 'react'
import { RoleBadge } from '@/components/RoleBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Loader2, Mail, Trash2 } from 'lucide-react'

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'

interface PendingInvite {
  id: string
  email: string
  role: UserRole
  name: string
  expiresAt: string
  createdAt: string
}

export function PendingInvitesList() {
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInvites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invites')
      if (!res.ok) throw new Error('Failed to load invites')
      const data = await res.json()
      setInvites(data.invites ?? [])
    } catch {
      setError('Could not load pending invites.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  async function handleRevoke(inviteId: string) {
    setRevoking(inviteId)
    try {
      const res = await fetch('/api/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      if (!res.ok) throw new Error('Failed to revoke invite')
      await fetchInvites()
    } catch {
      setError('Failed to revoke invite. Please try again.')
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading pending invites...
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-2">{error}</p>
    )
  }

  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No pending invites.</p>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {invites.map((invite) => {
            const expiresDate = new Date(invite.expiresAt).toLocaleDateString()
            const isRevoking = revoking === invite.id
            return (
              <li key={invite.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {invite.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{invite.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {invite.email}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <RoleBadge role={invite.role} />
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Clock className="h-3 w-3" />
                    Expires {expiresDate}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRevoke(invite.id)}
                    disabled={isRevoking}
                    title="Revoke invite"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {isRevoking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
