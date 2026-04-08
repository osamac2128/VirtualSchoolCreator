'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface Props {
  weekId: string
  courseId: string
  currentStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
}

export function MarkCompleteButton({ weekId, courseId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const nextStatus = status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
  const label = status === 'COMPLETED' ? 'Mark Incomplete' : status === 'IN_PROGRESS' ? 'Mark Complete' : 'Mark Complete'

  async function handleClick() {
    startTransition(async () => {
      const res = await fetch('/api/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId, courseId, status: nextStatus }),
      })
      if (res.ok) {
        setStatus(nextStatus)
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        status === 'COMPLETED'
          ? 'bg-[var(--status-completed)]/15 text-[var(--status-completed)] hover:bg-[var(--status-completed)]/25'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      } disabled:opacity-50`}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === 'COMPLETED' ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      {label}
    </button>
  )
}
