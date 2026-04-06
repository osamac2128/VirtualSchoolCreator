import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'

export default async function WeekPage({ params }: { params: { id: string; weekNumber: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please log in</div>

  const week = await prisma.week.findFirst({
    where: { 
      courseId: params.id, 
      weekNumber: parseInt(params.weekNumber) 
    },
    include: { 
      resources: true,
      theme: true,
    }
  })

  if (!week) notFound()

  // In a real app, you would check StudentProgress to see if tasks are complete
  // and render interactive components. For MVP, we render static or read-only elements.

  const objectives = (week.objectives as unknown) as Array<{ aeroCode?: string; text?: string }>
  const activities = (week.activities as unknown) as string[]
  const assessment = (week.assessment as unknown) as { formative?: string; summative?: string } | null

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold">Week {week.weekNumber}: {week.theme.title}</h1>
        <p className="text-xl text-gray-700 mt-2">{week.focus}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Learning Objectives</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                {objectives.map((obj, idx: number) => (
                  <li key={idx} className="text-gray-700">
                    {obj.text} <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2">{obj.aeroCode}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activities & Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.map((activity: string, idx: number) => (
                <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded border border-gray-100">
                  {/* This would be an interactive client component in real implementation */}
                  <Checkbox id={`activity-${idx}`} />
                  <label htmlFor={`activity-${idx}`} className="text-gray-800 text-sm leading-relaxed">{activity}</label>
                </div>
              ))}
            </CardContent>
          </Card>

          {assessment && (
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Assessments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-blue-800">
                <div>
                  <span className="font-semibold block">Formative:</span>
                  <p className="text-sm">{assessment.formative}</p>
                </div>
                {assessment.summative && (
                  <div>
                    <span className="font-semibold block mt-4">Summative:</span>
                    <p className="text-sm">{assessment.summative}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              {week.resources.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No external resources attached to this week.</p>
              ) : (
                <ul className="space-y-3">
                  {week.resources.map(resource => (
                    <li key={resource.id}>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
                        📄 {resource.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
