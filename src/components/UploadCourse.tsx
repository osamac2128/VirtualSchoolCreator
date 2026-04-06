'use client'

import { useState } from 'react'
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

      setStatus({ type: 'success', message: 'Upload successful! Generation is queued in the background.' })
      setFile(null)
      setCourseName('')
      setGradeLevel('')
      setTrack('STANDARD')
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
            <div className={`p-3 rounded text-sm ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {status.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
