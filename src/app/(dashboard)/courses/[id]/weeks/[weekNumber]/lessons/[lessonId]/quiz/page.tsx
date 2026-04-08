import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { QuizBuilder } from '@/components/QuizBuilder'

export default async function QuizBuilderPage({
  params,
}: {
  params: Promise<{ id: string; weekNumber: string; lessonId: string }>
}) {
  const { id, weekNumber, lessonId } = await params

  // Auth
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

  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    redirect(`/courses/${id}/weeks/${weekNumber}`)
  }

  const weekNum = parseInt(weekNumber, 10)
  if (isNaN(weekNum)) notFound()

  // Verify course belongs to teacher's school
  const course = await prisma.course.findFirst({
    where: { id, schoolId: dbUser.schoolId },
    select: { id: true, name: true },
  })
  if (!course) notFound()

  // For teachers (not admins) verify course membership
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

  // Verify lesson exists, belongs to this course/week, and is QUIZ type
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      week: {
        courseId: id,
        weekNumber: weekNum,
      },
    },
    select: { id: true, title: true, type: true },
  })
  if (!lesson) notFound()
  if (lesson.type !== 'QUIZ') {
    redirect(`/courses/${id}/weeks/${weekNumber}/edit`)
  }

  // Fetch existing quiz (if any)
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { answers: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quiz Builder"
        subtitle={lesson.title}
        breadcrumb={[
          { label: 'Courses', href: '/dashboard' },
          { label: course.name, href: `/courses/${id}` },
          { label: `Week ${weekNum}`, href: `/courses/${id}/weeks/${weekNumber}` },
          { label: 'Edit', href: `/courses/${id}/weeks/${weekNumber}/edit` },
        ]}
      />

      <QuizBuilder
        lessonId={lessonId}
        lessonTitle={lesson.title}
        existingQuiz={quiz}
      />
    </div>
  )
}
