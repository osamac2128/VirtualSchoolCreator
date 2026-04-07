import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UploadCourse from '@/components/UploadCourse'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, GraduationCap, UserCheck, Clock } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { schoolId: true, school: { select: { name: true } } },
  })
  if (!dbUser) redirect('/login')

  const { schoolId } = dbUser

  const [courseCount, userCount, teacherCount, studentCount, recentLogs] = await Promise.all([
    prisma.course.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
    prisma.user.count({ where: { schoolId, role: 'STUDENT' } }),
    prisma.auditLog.findMany({
      where: { user: { schoolId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { action: true, details: true, createdAt: true },
    }),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle={dbUser.school.name}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Courses"
          value={courseCount}
          subtitle="AI-generated curricula"
          icon={<BookOpen className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Registered Users"
          value={userCount}
          subtitle="Across all roles"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Teachers"
          value={teacherCount}
          subtitle="Active instructors"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Students"
          value={studentCount}
          subtitle="Enrolled learners"
          icon={<UserCheck className="h-5 w-5" />}
          variant="accent"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Upload form */}
        <div className="lg:col-span-3">
          <UploadCourse />
        </div>

        {/* System status */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <ul className="space-y-2">
                  {recentLogs.map((log, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {log.action}{log.details ? ` — ${log.details}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
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
