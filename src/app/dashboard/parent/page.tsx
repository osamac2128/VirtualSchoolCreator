import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please log in</div>

  const parentRelations = await prisma.parentStudent.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        include: {
          memberships: {
            where: { role: 'STUDENT' },
            include: { course: true }
          },
          progress: true
        }
      }
    }
  })

  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Parent Dashboard</h1>
      
      {parentRelations.length === 0 && (
        <p className="text-gray-600">No student accounts linked to your profile.</p>
      )}

      {parentRelations.map((relation) => (
        <div key={relation.id} className="space-y-6 mb-10">
          <h2 className="text-2xl font-semibold border-b pb-2">
            Student: {relation.student.name || relation.student.email}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relation.student.memberships.map(({ course }) => course && (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>Enrolled</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      Completed tasks: {relation.student.progress.filter(p => p.courseId === course.id && p.status === 'COMPLETED').length}
                    </p>
                    <Link 
                      href={`/courses/${course.id}?studentId=${relation.student.id}`} 
                      className="text-blue-600 hover:underline font-medium text-sm block"
                    >
                      View Course Progress
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
