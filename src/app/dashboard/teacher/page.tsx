import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please log in</div>

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, role: { in: ['TEACHER', 'OWNER'] } },
    include: { course: true }
  })

  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {memberships.map(({ course }) => course && (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle>{course.name}</CardTitle>
              <CardDescription>Grade {course.gradeLevel}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{course.totalWeeks} Weeks Total</p>
              <Link 
                href={`/courses/${course.id}`} 
                className="text-blue-600 hover:underline font-medium"
              >
                View Course Content
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
