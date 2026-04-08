import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ProgressRing } from '@/components/ProgressRing'
import { BookOpen, ArrowRight, TrendingUp } from 'lucide-react'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, name: true },
  })
  if (!dbUser) redirect('/login')

  const memberships = await prisma.membership.findMany({
    where: { userId: dbUser.id, role: 'STUDENT' },
    include: {
      course: {
        include: {
        },
      },
    },
  })

  const courses = memberships.map((m) => m.course).filter(Boolean)

  // Fetch progress for all courses
  const progressData = await prisma.studentProgress.findMany({
    where: { userId: dbUser.id },
    select: { status: true, weekId: true, courseId: true },
  })

  // Per-course completed map
  const completedByCourse = new Map<string, number>()
  for (const p of progressData) {
    if (p.status === 'COMPLETED' && p.courseId) {
      completedByCourse.set(p.courseId, (completedByCourse.get(p.courseId) ?? 0) + 1)
    }
  }

  const totalWeeks = courses.reduce((sum, c) => sum + (c?.totalWeeks ?? 0), 0)
  const totalCompleted = [...completedByCourse.values()].reduce((a, b) => a + b, 0)
  const overallPercent = totalWeeks > 0 ? Math.round((totalCompleted / totalWeeks) * 100) : 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Learning"
        subtitle={`Welcome back, ${dbUser.name.split(' ')[0]}`}
      />

      {/* Overall progress banner */}
      {courses.length > 0 && (
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="flex items-center gap-6 p-6">
            <ProgressRing percent={overallPercent} size={80} strokeWidth={7} />
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">Overall Progress</p>
              <p className="mt-0.5 text-3xl font-bold">{overallPercent}%</p>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {totalCompleted} of {totalWeeks} weeks completed
              </p>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-2 text-primary-foreground/60">
              <TrendingUp className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course grid */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-8 py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No courses enrolled yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Contact your teacher to get enrolled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            if (!course) return null
            const weekCount = course.totalWeeks
            const courseCompleted = completedByCourse.get(course.id) ?? 0
            const coursePercent = weekCount > 0 ? Math.min(Math.round((courseCompleted / weekCount) * 100), 100) : 0

            return (
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-snug">{course.name}</CardTitle>
                      <CardDescription className="mt-0.5">Grade {course.gradeLevel}</CardDescription>
                    </div>
                    <ProgressRing percent={coursePercent} size={52} strokeWidth={5} />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  <p className="text-sm text-muted-foreground">
                    {weekCount} week{weekCount !== 1 ? 's' : ''} total
                  </p>
                </CardContent>
                <CardFooter className="border-t border-border pt-3">
                  <Link
                    href={`/courses/${course.id}`}
                    className={buttonVariants({ variant: coursePercent > 0 ? 'default' : 'outline', size: 'sm' }) + ' w-full'}
                  >
                    {coursePercent > 0 ? 'Continue' : 'Start'}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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
