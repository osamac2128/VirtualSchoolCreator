import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { EnrollmentManager } from '@/components/EnrollmentManager'

interface EnrollmentsPageProps {
  searchParams: Promise<{ courseId?: string }>
}

export default async function EnrollmentsPage({ searchParams }: EnrollmentsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { schoolId: true },
  })
  if (!dbUser) redirect('/login')

  const { courseId } = await searchParams

  // Fetch all courses for this school
  const courses = await prisma.course.findMany({
    where: { schoolId: dbUser.schoolId },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      track: true,
      _count: { select: { memberships: true } },
    },
    orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
  })

  // Fetch all users in this school (for the add-user dropdown)
  const schoolUsers = await prisma.user.findMany({
    where: { schoolId: dbUser.schoolId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  const initialCourseId = courseId ?? null

  return (
    <div className="space-y-8">
      <PageHeader
        title="Enrollment Management"
        subtitle="Assign students and teachers to courses"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard/admin' }]}
      />
      <EnrollmentManager
        courses={courses}
        initialCourseId={initialCourseId}
        schoolUsers={schoolUsers}
      />
    </div>
  )
}
