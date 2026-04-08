import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { WeekLessonEditor } from '@/components/WeekLessonEditor'

export default async function EditWeekPage({
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

  // Only teachers and admins can access this page
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    redirect(`/courses/${id}/weeks/${weekNumber}`)
  }

  const weekNum = parseInt(weekNumber, 10)
  if (isNaN(weekNum)) notFound()

  // Verify course belongs to user's school
  const course = await prisma.course.findFirst({
    where: { id, schoolId: dbUser.schoolId },
    select: { id: true, name: true },
  })
  if (!course) notFound()

  // For teachers (not admins), verify they have TEACHER or OWNER membership in the course
  if (dbUser.role === 'TEACHER') {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        courseId: id,
        role: { in: ['TEACHER', 'OWNER'] },
      },
    })
    if (!membership) redirect(`/courses/${id}/weeks/${weekNumber}`)
  }

  // Fetch the week with lessons ordered by `order`, each lesson with quiz data
  const week = await prisma.week.findFirst({
    where: { courseId: id, weekNumber: weekNum },
    include: {
      theme: { select: { title: true } },
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { order: 'asc' },
                include: { answers: true },
              },
            },
          },
        },
      },
    },
  })

  if (!week) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Week ${week.weekNumber}`}
        subtitle={week.focus}
        breadcrumb={[
          { label: 'Courses', href: '/dashboard' },
          { label: course.name, href: `/courses/${id}` },
          { label: `Week ${week.weekNumber}`, href: `/courses/${id}/weeks/${weekNumber}` },
        ]}
      />

      <WeekLessonEditor
        weekId={week.id}
        courseId={id}
        weekNumber={weekNum}
        lessons={week.lessons}
      />
    </div>
  )
}
