'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function UploadCourse() {
  const [file, setFile] = useState<File | null>(null)
  const [courseName, setCourseName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [track, setTrack] = useState('STANDARD')
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [generationPending, setGenerationPending] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (!generationPending || refreshCount >= 3) return
    const timer = setTimeout(() => {
      router.refresh()
      setRefreshCount(c => c + 1)
      if (refreshCount >= 2) setGenerationPending(false)
    }, 15000)
    return () => clearTimeout(timer)
  }, [generationPending, refreshCount, router])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !courseName || !gradeLevel || !track) {
      setStatus({ type: 'error', message: 'Please fill in all fields.' })
      return
    }

    setIsUploading(true)
    setStatus(null)

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

      setGenerationPending(true)
      setCourseName('')
      setGradeLevel('')
      setTrack('STANDARD')
      setFile(null)
      setStatus({ type: 'success', message: 'Upload successful! Generating your course — this takes 30–60 seconds.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setStatus({ type: 'error', message })
    } finally {
      setIsUploading(false)
    }
  }

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
          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Generate Course'}
          </Button>

          {status && (
            <div className={`rounded-lg p-3 text-sm ${
              status.type === 'success'
                ? 'bg-[var(--status-completed)]/10 text-[var(--status-completed)]'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {status.message}
              {generationPending && (
                <p className="mt-1 text-xs opacity-70">Refreshing automatically every 15 seconds...</p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
