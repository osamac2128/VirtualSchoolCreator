import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { notFound, redirect } from 'next/navigation'
import { CalendarDays, BookOpen, ArrowRight, Layers } from 'lucide-react'

const trackLabels: Record<string, string> = {
  STANDARD: 'Standard',
  PREAP: 'Pre-AP',
  AP: 'AP',
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { schoolId: true },
  })
  if (!dbUser) redirect('/login')

  const course = await prisma.course.findUnique({
    where: { id, schoolId: dbUser.schoolId },
    include: {
      themes: {
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            select: {
              id: true,
              weekNumber: true,
              focus: true,
              objectives: true,
            },
          },
        },
        orderBy: { title: 'asc' },
      },
      _count: { select: { themes: true } },
    },
  })

  if (!course) notFound()

  return (
    <div className="space-y-8">
      <PageHeader
        title={course.name}
        subtitle={`Grade ${course.gradeLevel} · ${trackLabels[course.track] ?? course.track} · ${course.totalWeeks} Weeks`}
        breadcrumb={[{ label: 'Courses', href: '/dashboard' }]}
      />

      {/* Course metadata band */}
      <div className="rounded-xl bg-secondary border border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {course._count.themes} themes
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {course.totalWeeks} weeks total
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            Grade {course.gradeLevel}
          </span>
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
            course.track === 'AP'
              ? 'bg-[var(--role-admin)]/15 text-[var(--role-admin)] ring-[var(--role-admin)]/30'
              : course.track === 'PREAP'
                ? 'bg-[var(--accent)]/15 text-[var(--accent-foreground)] ring-[var(--accent)]/30'
                : 'bg-primary/10 text-primary ring-primary/20'
          }`}>
            {trackLabels[course.track] ?? course.track}
          </span>
        </div>
      </div>

      {/* Themes */}
      <div className="space-y-10">
        {course.themes.map((theme) => (
          <section key={theme.id}>
            {/* Theme header with amber left border */}
            <div className="mb-4 flex items-center gap-3 border-l-4 border-[var(--accent)] pl-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{theme.title}</h2>
                <p className="text-sm text-muted-foreground">{theme.durationWeeks} weeks</p>
              </div>
            </div>

            {/* Week grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {theme.weeks.map((week) => (
                <Card key={week.id} className="group relative flex flex-col hover:shadow-md transition-shadow">
                  {/* Week number — top right */}
                  <span className="absolute right-3 top-3 text-3xl font-bold text-muted/60 leading-none select-none">
                    {week.weekNumber}
                  </span>
                  <CardHeader className="pb-2 pr-12">
                    <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                      Week {week.weekNumber}
                    </CardDescription>
                    <CardTitle className="text-sm leading-snug line-clamp-2">{week.focus}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    {Array.isArray(week.objectives) && week.objectives.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {(week.objectives as unknown[]).length} objectives
                      </span>
                    )}
                  </CardContent>
                  <div className="border-t border-border px-4 py-2.5">
                    <Link
                      href={`/courses/${course.id}/weeks/${week.weekNumber}`}
                      className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      View Plan <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
