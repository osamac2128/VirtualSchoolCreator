'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { BookOpen, Users2, X, Plus, Loader2 } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type MembershipRole = 'STUDENT' | 'TEACHER'

interface Course {
  id: string
  name: string
  gradeLevel: number
  track: string
  _count: { memberships: number }
}

interface SchoolUser {
  id: string
  name: string
  email: string
  role: string
}

interface Enrollment {
  id: string
  userId: string
  role: MembershipRole
  user: { id: string; name: string; email: string; role: string }
}

interface EnrollmentManagerProps {
  courses: Course[]
  initialCourseId: string | null
  schoolUsers: SchoolUser[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const trackLabels: Record<string, string> = { STANDARD: 'Standard', PREAP: 'Pre-AP', AP: 'AP' }

const roleColors: Record<string, string> = {
  STUDENT: 'bg-primary/10 text-primary ring-primary/20',
  TEACHER: 'bg-[var(--accent)]/15 text-[var(--accent-foreground)] ring-[var(--accent)]/30',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EnrollmentManager({ courses, initialCourseId, schoolUsers }: EnrollmentManagerProps) {
  const router = useRouter()

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialCourseId)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null)

  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<MembershipRole>('STUDENT')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [removingId, setRemovingId] = useState<string | null>(null)

  // Fetch enrollments for a course
  const fetchEnrollments = useCallback(async (courseId: string) => {
    setLoadingEnrollments(true)
    setEnrollmentsError(null)
    try {
      const res = await fetch(`/api/enrollments?courseId=${encodeURIComponent(courseId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch enrollments')
      setEnrollments(data.enrollments)
    } catch (err) {
      setEnrollmentsError(err instanceof Error ? err.message : 'Unknown error')
      setEnrollments([])
    } finally {
      setLoadingEnrollments(false)
    }
  }, [])

  // Select a course
  function handleSelectCourse(courseId: string) {
    setSelectedCourseId(courseId)
    setAddUserId('')
    setAddError(null)
    // Update URL searchParam without full navigation
    const url = new URL(window.location.href)
    url.searchParams.set('courseId', courseId)
    router.replace(url.pathname + url.search, { scroll: false })
    fetchEnrollments(courseId)
  }

  // Add enrollment
  async function handleAdd() {
    if (!selectedCourseId || !addUserId) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, userId: addUserId, role: addRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add enrollment')
      setAddUserId('')
      await fetchEnrollments(selectedCourseId)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAdding(false)
    }
  }

  // Remove enrollment
  async function handleRemove(membershipId: string) {
    if (!selectedCourseId) return
    setRemovingId(membershipId)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove enrollment')
      await fetchEnrollments(selectedCourseId)
    } catch (err) {
      // Surface error briefly in the UI
      setEnrollmentsError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setRemovingId(null)
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null

  // Users not yet enrolled in the selected course
  const enrolledUserIds = new Set(enrollments.map((e) => e.userId))
  const unenrolledUsers = schoolUsers.filter((u) => !enrolledUserIds.has(u.id))

  return (
    <div className="flex gap-6 h-full">
      {/* ── Left: course list ── */}
      <div className="w-72 flex-shrink-0 space-y-2">
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Courses
        </p>
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground px-1">No courses found.</p>
        )}
        {courses.map((course) => {
          const isSelected = course.id === selectedCourseId
          return (
            <button
              key={course.id}
              onClick={() => handleSelectCourse(course.id)}
              className={`w-full rounded-xl border text-left px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <p className="text-sm font-medium text-foreground leading-snug">{course.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Grade {course.gradeLevel} &middot; {trackLabels[course.track] ?? course.track}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <Users2 className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                {course._count.memberships} enrolled
              </p>
            </button>
          )
        })}
      </div>

      {/* ── Right: enrollment panel ── */}
      <div className="flex-1 min-w-0">
        {!selectedCourse ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center">
            <BookOpen className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Select a course to manage enrollments</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current enrollments */}
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm">
                  Enrolled in &ldquo;{selectedCourse.name}&rdquo;
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingEnrollments ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : enrollmentsError ? (
                  <p className="px-4 py-4 text-sm text-destructive">{enrollmentsError}</p>
                ) : enrollments.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">
                    No one is enrolled yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {enrollments.map((enrollment) => (
                      <li key={enrollment.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {enrollment.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {enrollment.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {enrollment.user.email}
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            roleColors[enrollment.role] ?? 'bg-muted text-muted-foreground ring-border'
                          }`}
                        >
                          {enrollment.role}
                        </span>
                        <button
                          onClick={() => handleRemove(enrollment.id)}
                          disabled={removingId === enrollment.id}
                          className={buttonVariants({ variant: 'destructive', size: 'icon-sm' })}
                          title="Remove enrollment"
                          aria-label={`Remove ${enrollment.user.name}`}
                        >
                          {removingId === enrollment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Add enrollment */}
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm">Add User to Course</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  {/* User select */}
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="enroll-user"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      User
                    </label>
                    <select
                      id="enroll-user"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loadingEnrollments}
                    >
                      <option value="">Select a user...</option>
                      {unenrolledUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role select */}
                  <div className="flex-shrink-0">
                    <label
                      htmlFor="enroll-role"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Role
                    </label>
                    <select
                      id="enroll-role"
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as MembershipRole)}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                    </select>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={handleAdd}
                    disabled={!addUserId || adding || loadingEnrollments}
                    className={buttonVariants({ variant: 'default', size: 'default' })}
                  >
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </div>

                {addError && (
                  <p className="mt-2 text-xs text-destructive">{addError}</p>
                )}

                {unenrolledUsers.length === 0 && !loadingEnrollments && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    All school users are already enrolled in this course.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
