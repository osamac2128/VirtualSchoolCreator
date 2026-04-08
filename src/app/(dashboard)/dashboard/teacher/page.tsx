import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { BookOpen, CalendarDays, ArrowRight } from 'lucide-react'

const trackColors: Record<string, string> = {
  STANDARD: 'bg-primary',
  PREAP:    'bg-[var(--accent)]',
  AP:       'bg-[var(--role-admin)]',
}

const trackLabels: Record<string, string> = {
  STANDARD: 'Standard',
  PREAP:    'Pre-AP',
  AP:       'AP',
}

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  })
  if (!dbUser) redirect('/login')

  const memberships = await prisma.membership.findMany({
    where: { userId: dbUser.id, role: { in: ['TEACHER', 'OWNER'] } },
    include: {
      course: {
        include: {
          _count: { select: { themes: true } },
        },
      },
    },
  })

  const courses = memberships.map((m) => m.course).filter(Boolean)
  const totalWeeks = courses.reduce((sum, c) => sum + (c?.totalWeeks ?? 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Courses"
        subtitle={`${courses.length} course${courses.length !== 1 ? 's' : ''} assigned`}
      />

      {/* Compact stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Courses Assigned"
          value={courses.length}
          icon={<BookOpen className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Total Weeks"
          value={totalWeeks}
          subtitle="Across all courses"
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-8 py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No courses assigned yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Ask your administrator to assign courses to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            if (!course) return null
            const trackColor = trackColors[course.track] ?? 'bg-muted'
            const trackLabel = trackLabels[course.track] ?? course.track
            return (
              <Card key={course.id} className="flex flex-col overflow-hidden">
                {/* Track color stripe */}
                <div className={`h-1.5 w-full ${trackColor}`} />
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
                      {trackLabel}
                    </span>
                  </div>
                  <CardDescription>Grade {course.gradeLevel}</CardDescription>
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
                </CardContent>
                <CardFooter className="border-t border-border pt-3">
                  <Link href={`/courses/${course.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' w-full'}>
                    View Course <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
