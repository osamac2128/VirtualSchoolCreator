import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ProgressRing } from '@/components/ProgressRing'
import { RoleBadge } from '@/components/RoleBadge'
import { ArrowRight, Users } from 'lucide-react'

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  })
  if (!dbUser) redirect('/login')

  const parentRelations = await prisma.parentStudent.findMany({
    where: { parentId: dbUser.id },
    include: {
      student: {
        include: {
          memberships: {
            where: { role: 'STUDENT' },
            include: {
              course: true,
            },
          },
          progress: { select: { courseId: true, status: true } },
        },
      },
    },
  })

  return (
    <div className="space-y-10">
      <PageHeader
        title="Children's Progress"
        subtitle={`${parentRelations.length} student${parentRelations.length !== 1 ? 's' : ''} linked`}
      />

      {parentRelations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-8 py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No students linked to your account.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Contact your school administrator.</p>
        </div>
      ) : (
        parentRelations.map((relation) => {
          const student = relation.student
          const courses = student.memberships.map((m) => m.course).filter(Boolean)

          return (
            <section key={relation.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{student.name}</h2>
                  <RoleBadge role="STUDENT" />
                </div>
              </div>

              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-12">No courses enrolled.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 pl-0 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => {
                    if (!course) return null
                    const totalWeeks = course.totalWeeks
                    const completed = student.progress.filter(
                      (p) => p.courseId === course.id && p.status === 'COMPLETED'
                    ).length
                    const percent = totalWeeks > 0 ? Math.round((completed / totalWeeks) * 100) : 0

                    return (
                      <Card key={course.id} className="flex flex-col">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-sm font-semibold leading-snug">{course.name}</CardTitle>
                              <CardDescription className="mt-0.5">Grade {course.gradeLevel}</CardDescription>
                            </div>
                            <ProgressRing percent={percent} size={48} strokeWidth={5} />
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-3">
                          <p className="text-sm text-muted-foreground">
                            {completed} of {totalWeeks} weeks completed
                          </p>
                        </CardContent>
                        <CardFooter className="border-t border-border pt-3">
                          <Link
                            href={`/courses/${course.id}?studentId=${student.id}`}
                            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' w-full'}
                          >
                            View Details <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
