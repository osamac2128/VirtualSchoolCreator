import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { notFound } from 'next/navigation'

export default async function CoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please log in</div>

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      themes: {
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' }
          }
        },
        orderBy: { title: 'asc' }
      }
    }
  })

  if (!course) notFound()

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold">{course.name}</h1>
        <p className="text-lg text-gray-600 mt-2">Grade {course.gradeLevel} | {course.totalWeeks} Weeks</p>
      </div>

      <div className="space-y-10">
        {course.themes.map((theme) => (
          <div key={theme.id} className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">{theme.title} ({theme.durationWeeks} weeks)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {theme.weeks.map((week) => (
                <Card key={week.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Week {week.weekNumber}</CardTitle>
                    <CardDescription className="line-clamp-2">{week.focus}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href={`/courses/${course.id}/weeks/${week.weekNumber}`} 
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Plan &rarr;
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
