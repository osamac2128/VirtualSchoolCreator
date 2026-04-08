import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Target,
  CheckSquare,
  ClipboardList,
  Award,
  FileText,
  Play,
  ExternalLink,
  File,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { WeekStatusBadge } from '@/components/WeekStatusBadge'
import { MarkCompleteButton } from '@/components/MarkCompleteButton'

const resourceIcon: Record<string, React.ReactNode> = {
  VIDEO:      <Play className="h-4 w-4 text-[var(--role-admin)]" />,
  DOCUMENT:   <FileText className="h-4 w-4 text-primary" />,
  LINK:       <ExternalLink className="h-4 w-4 text-[var(--accent-foreground)]" />,
  WORKSHEET:  <File className="h-4 w-4 text-muted-foreground" />,
}

export default async function WeekPage({
  params,
}: {
  params: Promise<{ id: string; weekNumber: string }>
}) {
  const { id, weekNumber } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) redirect('/login')

  const weekNum = parseInt(weekNumber)

  // Verify the course belongs to the user's school before fetching week
  const courseCheck = await prisma.course.findFirst({
    where: { id, schoolId: dbUser.schoolId },
    select: { id: true },
  })
  if (!courseCheck) notFound()

  const week = await prisma.week.findFirst({
    where: { courseId: id, weekNumber: weekNum },
    include: {
      resources: true,
      theme: true,
    },
  })

  if (!week) notFound()

  // Adjacent weeks for navigation
  const [prevWeek, nextWeek] = await Promise.all([
    prisma.week.findFirst({ where: { courseId: id, weekNumber: weekNum - 1 }, select: { weekNumber: true } }),
    prisma.week.findFirst({ where: { courseId: id, weekNumber: weekNum + 1 }, select: { weekNumber: true } }),
  ])

  // Fetch student progress for this week
  let weekStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED'
  if (dbUser.role === 'STUDENT') {
    const progress = await prisma.studentProgress.findFirst({
      where: { userId: dbUser.id, weekId: week.id },
      select: { status: true },
    })
    weekStatus = (progress?.status ?? 'NOT_STARTED') as typeof weekStatus
  }

  const objectives = (week.objectives as unknown) as Array<{ aeroCode?: string; text?: string }>
  const activities = (week.activities as unknown) as string[]
  const assessment = (week.assessment as unknown) as { formative?: string; summative?: string } | null

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Week ${week.weekNumber}: ${week.theme.title}`}
        subtitle={week.focus}
        breadcrumb={[
          { label: 'Courses', href: '/dashboard' },
          { label: week.theme.title, href: `/courses/${id}` },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {/* Week navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                {prevWeek ? (
                  <Link href={`/courses/${id}/weeks/${prevWeek.weekNumber}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Week {prevWeek.weekNumber}
                  </Link>
                ) : (
                  <div />
                )}
                <span className="text-xs font-medium text-muted-foreground">Week {week.weekNumber}</span>
                {nextWeek ? (
                  <Link href={`/courses/${id}/weeks/${nextWeek.weekNumber}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    Week {nextWeek.weekNumber} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student progress */}
          {dbUser.role === 'STUDENT' && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <WeekStatusBadge status={weekStatus} />
                <MarkCompleteButton
                  weekId={week.id}
                  courseId={id}
                  currentStatus={weekStatus}
                />
              </CardContent>
            </Card>
          )}

          {/* Resources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {week.resources.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No resources attached.</p>
              ) : (
                <ul className="space-y-2">
                  {week.resources.map((resource) => (
                    <li key={resource.id}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        {resourceIcon[resource.type] ?? resourceIcon['LINK']}
                        <span className="truncate">{resource.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Objectives */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Learning Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {objectives.length === 0 ? (
                <p className="text-sm text-muted-foreground">No objectives defined.</p>
              ) : (
                <ul className="space-y-2.5">
                  {objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-1 flex-shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-foreground">{obj.text}</span>
                        {obj.aeroCode && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--accent-foreground)] ring-1 ring-inset ring-[var(--accent)]/30">
                            {obj.aeroCode}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-4 w-4 text-primary" />
                Activities & Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities defined.</p>
              ) : (
                activities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 border-primary/40 bg-background">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/20" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{activity}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Assessment */}
          {assessment && (
            <Card className="border-[var(--accent)]/30 bg-[var(--accent)]/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <ClipboardList className="h-4 w-4 text-[var(--accent-foreground)]" />
                  Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessment.formative && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ClipboardList className="h-3.5 w-3.5 text-[var(--accent-foreground)]" />
                      Formative
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{assessment.formative}</p>
                  </div>
                )}
                {assessment.summative && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Award className="h-3.5 w-3.5 text-[var(--accent-foreground)]" />
                      Summative
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{assessment.summative}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
