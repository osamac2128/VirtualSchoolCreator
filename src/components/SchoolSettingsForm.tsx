'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  initialName: string
  initialDomain: string | null
}

export function SchoolSettingsForm({ initialName, initialDomain }: Props) {
  const [name, setName] = useState(initialName)
  const [domain, setDomain] = useState(initialDomain ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus(null)
    try {
      const res = await fetch('/api/school', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain: domain || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus({ type: 'success', message: 'Settings saved successfully.' })
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schoolName">School Name</Label>
        <Input
          id="schoolName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain">Domain <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g., aisj.edu.sa"
        />
      </div>
      <Button type="submit" disabled={isSubmitting} size="sm">
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>
      {status && (
        <p className={`text-sm ${status.type === 'success' ? 'text-[var(--status-completed)]' : 'text-destructive'}`}>
          {status.message}
        </p>
      )}
    </form>
  )
}
