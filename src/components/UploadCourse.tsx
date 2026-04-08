'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CourseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'

interface StatusPollResponse {
  status: CourseStatus
  errorMessage?: string | null
  name: string
}

function statusMessage(status: CourseStatus, errorMessage?: string | null): string {
  switch (status) {
    case 'PENDING':    return 'Upload received. Queuing generation...'
    case 'PROCESSING': return 'Generating your course with AI... (this takes 30-60 seconds)'
    case 'COMPLETE':   return 'Course generated successfully!'
    case 'FAILED':     return `Course generation failed: ${errorMessage ?? 'Unknown error'}. Please try again.`
  }
}

function AnimatedDots() {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)
    return () => clearInterval(id)
  }, [])
  return <span aria-hidden="true">{dots}</span>
}

export default function UploadCourse() {
  const [file, setFile] = useState<File | null>(null)
  const [courseName, setCourseName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [track, setTrack] = useState('STANDARD')
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [courseStatus, setCourseStatus] = useState<CourseStatus | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const router = useRouter()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function startPolling(id: string) {
    pollCount.current = 0
    pollRef.current = setInterval(async () => {
      pollCount.current += 1
      // Stop after 60s (12 × 5s)
      if (pollCount.current > 12) {
        stopPolling()
        setStatus({ type: 'error', message: 'Timed out waiting for course generation. Please refresh the page.' })
        return
      }

      try {
        const res = await fetch(`/api/courses/${id}/status`)
        if (!res.ok) return
        const data: StatusPollResponse = await res.json()
        setCourseStatus(data.status)

        if (data.status === 'COMPLETE') {
          stopPolling()
          setStatus({ type: 'success', message: statusMessage('COMPLETE') })
          router.refresh()
        } else if (data.status === 'FAILED') {
          stopPolling()
          setStatus({ type: 'error', message: statusMessage('FAILED', data.errorMessage) })
        } else {
          setStatus({ type: 'info', message: statusMessage(data.status) })
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 5000)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !courseName || !gradeLevel || !track) {
      setStatus({ type: 'error', message: 'Please fill in all fields.' })
      return
    }

    stopPolling()
    setIsUploading(true)
    setStatus(null)
    setCourseStatus(null)
    setCourseId(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('courseName', courseName)
    formData.append('gradeLevel', gradeLevel)
    formData.append('track', track)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      const { courseId: newCourseId } = data as { courseId: string }
      setCourseId(newCourseId)
      setCourseStatus('PENDING')
      setCourseName('')
      setGradeLevel('')
      setTrack('STANDARD')
      setFile(null)
      setStatus({ type: 'info', message: statusMessage('PENDING') })
      startPolling(newCourseId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setStatus({ type: 'error', message })
    } finally {
      setIsUploading(false)
    }
  }

  const isPolling = courseId !== null && courseStatus !== 'COMPLETE' && courseStatus !== 'FAILED'

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Upload Atlas Export</CardTitle>
        <CardDescription>Upload your Excel or CSV curriculum to generate an AI course.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseName">Course Name</Label>
            <Input
              id="courseName"
              placeholder="e.g., AP Computer Science"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Input
                id="gradeLevel"
                type="number"
                placeholder="e.g., 11"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="track">Track</Label>
              <Select value={track} onValueChange={(val) => val && setTrack(val)}>
                <SelectTrigger id="track">
                  <SelectValue placeholder="Select track" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="PREAP">Pre-AP</SelectItem>
                  <SelectItem value="AP">AP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Atlas Export File (.xlsx, .csv)</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isUploading || isPolling}>
            {isUploading ? 'Uploading...' : 'Generate Course'}
          </Button>

          {status && (
            <div
              className={`rounded-lg p-3 text-sm ${
                status.type === 'success'
                  ? 'bg-[var(--status-completed)]/10 text-[var(--status-completed)]'
                  : status.type === 'error'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}
            >
              <span>{status.message}</span>
              {isPolling && <AnimatedDots />}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
