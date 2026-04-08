import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'

interface PageProps {
  params: Promise<{ id: string }>
}

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

function StatusDot({ status }: { status: ProgressStatus | undefined }) {
  if (status === 'COMPLETED') {
    return (
      <span title="Completed" className="text-green-500 text-base leading-none">
        ●
      </span>
    )
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span title="In Progress" className="text-amber-500 text-base leading-none">
        ●
      </span>
    )
  }
  return (
    <span title="Not Started" className="text-muted-foreground/30 text-base leading-none">
      ●
    </span>
  )
}

export default async function RosterPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) redirect('/login')
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') redirect('/dashboard')

  // Fetch the course — verify it belongs to the same school and isn't deleted
  const course = await prisma.course.findFirst({
    where: { id, schoolId: dbUser.schoolId, deletedAt: null },
    include: {
      themes: {
        orderBy: { title: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            select: { id: true, weekNumber: true, focus: true },
          },
        },
      },
      memberships: {
        where: { role: 'STUDENT' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!course) redirect('/dashboard/teacher')

  // For TEACHER role, verify they have membership in this course
  if (dbUser.role === 'TEACHER') {
    const isMember = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        courseId: id,
        role: { in: ['TEACHER', 'OWNER'] },
      },
    })
    if (!isMember) redirect('/dashboard/teacher')
  }

  const students = course.memberships.map((m) => m.user)

  const allWeeks = course.themes
    .flatMap((t) => t.weeks)
    .sort((a, b) => a.weekNumber - b.weekNumber)

  // Fetch all StudentProgress rows for this course
  const progressRecords = await prisma.studentProgress.findMany({
    where: {
      courseId: id,
      userId: { in: students.map((s) => s.id) },
      weekId: { not: null },
    },
    select: { userId: true, weekId: true, status: true },
  })

  // Build progress matrix: progressMatrix[studentId][weekId] = status
  const progressMatrix: Record<string, Record<string, ProgressStatus>> = {}
  for (const record of progressRecords) {
    if (!record.weekId) continue
    if (!progressMatrix[record.userId]) progressMatrix[record.userId] = {}
    progressMatrix[record.userId][record.weekId] = record.status as ProgressStatus
  }

  // Compute per-week completion counts for summary row
  const weekCompletionCounts: Record<string, number> = {}
  for (const week of allWeeks) {
    weekCompletionCounts[week.id] = students.filter(
      (s) => progressMatrix[s.id]?.[week.id] === 'COMPLETED'
    ).length
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Student Roster — ${course.name}`}
        subtitle={`${students.length} student${students.length !== 1 ? 's' : ''} enrolled`}
        breadcrumb={[
          { label: 'My Courses', href: '/dashboard/teacher' },
          { label: course.name, href: `/courses/${course.id}` },
        ]}
      />

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-8 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No students enrolled yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Ask your administrator to enroll students in this course.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Student
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Email
                </th>
                {allWeeks.map((week) => (
                  <th
                    key={week.id}
                    className="px-3 py-3 text-center font-medium text-muted-foreground whitespace-nowrap"
                    title={week.focus}
                  >
                    W{week.weekNumber}
                  </th>
                ))}
              </tr>
              {/* Summary row */}
              <tr className="border-b border-border bg-primary/5">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 bg-primary/5 px-4 py-2 text-xs font-semibold text-muted-foreground"
                >
                  Completed / {students.length}
                </td>
                {allWeeks.map((week) => (
                  <td key={week.id} className="px-3 py-2 text-center text-xs font-semibold">
                    <span
                      className={
                        weekCompletionCounts[week.id] === students.length
                          ? 'text-green-600'
                          : weekCompletionCounts[week.id] > 0
                            ? 'text-amber-600'
                            : 'text-muted-foreground/50'
                      }
                    >
                      {weekCompletionCounts[week.id]}/{students.length}
                    </span>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.id}
                  className={
                    idx % 2 === 0
                      ? 'border-b border-border/50'
                      : 'border-b border-border/50 bg-muted/20'
                  }
                >
                  <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {student.name}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                    {student.email}
                  </td>
                  {allWeeks.map((week) => (
                    <td key={week.id} className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <StatusDot status={progressMatrix[student.id]?.[week.id]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">●</span> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-amber-500">●</span> In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/30">●</span> Not Started
        </span>
      </div>
    </div>
  )
}
