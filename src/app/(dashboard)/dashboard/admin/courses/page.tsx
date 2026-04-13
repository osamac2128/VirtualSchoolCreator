import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { BookOpen, CalendarDays, ArrowRight, Plus } from 'lucide-react'
import { GapAnalysisButton } from '@/components/GapAnalysisButton'
import { CourseActions } from '@/components/CourseActions'

const trackLabels: Record<string, string> = { STANDARD: 'Standard', PREAP: 'Pre-AP', AP: 'AP' }
const trackColors: Record<string, string> = {
  STANDARD: 'bg-primary',
  PREAP: 'bg-[var(--accent)]',
  AP: 'bg-[var(--role-admin)]',
}

export default async function AdminCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { schoolId: true },
  })
  if (!dbUser) redirect('/login')

  const courses = await prisma.course.findMany({
    where: { schoolId: dbUser.schoolId, deletedAt: null },
    include: { _count: { select: { themes: true, memberships: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="All Courses"
        subtitle={`${courses.length} course${courses.length !== 1 ? 's' : ''} in your school`}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard/admin' }]}
        action={
          <Link href="/dashboard/admin" className={buttonVariants({ variant: 'default', size: 'sm' })}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Course
          </Link>
        }
      />

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-8 py-20 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No courses yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Upload an Atlas export from the Dashboard to generate your first course.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col overflow-hidden">
              <div className={`h-1.5 w-full ${trackColors[course.track] ?? 'bg-muted'}`} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{course.name}</CardTitle>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    course.track === 'AP'
                      ? 'bg-[var(--role-admin)]/15 text-[var(--role-admin)] ring-[var(--role-admin)]/30'
                      : course.track === 'PREAP'
                        ? 'bg-[var(--accent)]/15 text-[var(--accent-foreground)] ring-[var(--accent)]/30'
                        : 'bg-primary/10 text-primary ring-primary/20'
                  }`}>
                    {trackLabels[course.track] ?? course.track}
                  </span>
                </div>
                <CardDescription>Grade {course.gradeLevel}</CardDescription>

                {/* Status badge for non-complete courses */}
                {(course.status === 'PENDING' || course.status === 'PROCESSING') && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <span className="inline-block h-2 w-2 animate-spin rounded-full border border-amber-500 border-t-transparent" aria-hidden="true" />
                    Generating...
                  </div>
                )}
                {course.status === 'FAILED' && (
                  <div
                    className="mt-1 inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20"
                    title={course.errorMessage ?? 'Generation failed'}
                  >
                    Generation Failed
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 pb-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {course.totalWeeks} weeks
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course._count.themes} themes
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {course._count.memberships} enrolled
                </p>
              </CardContent>

              <div className="border-t border-border px-4 py-2.5 space-y-2">
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View Course <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
                <GapAnalysisButton courseId={course.id} />
                <CourseActions
                  courseId={course.id}
                  courseName={course.name}
                  gradeLevel={course.gradeLevel}
                  track={course.track}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
