import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { RoleBadge } from '@/components/RoleBadge'
import { ParentStudentLinker } from '@/components/ParentStudentLinker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CalendarDays, BookOpen } from 'lucide-react'

type RouteParams = { params: Promise<{ userId: string }> }

export default async function UserDetailPage({ params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!adminUser) redirect('/login')
  if (adminUser.role !== 'ADMIN') redirect('/dashboard/admin')

  const { userId } = await params

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, schoolId: adminUser.schoolId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      memberships: {
        select: {
          id: true,
          role: true,
          course: {
            select: { id: true, name: true, gradeLevel: true, track: true },
          },
        },
        where: { course: { isNot: null } },
      },
      children: {
        select: {
          id: true,
          student: { select: { id: true, name: true, email: true } },
        },
      },
      parents: {
        select: {
          id: true,
          parent: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!targetUser) redirect('/dashboard/admin/users')

  const isStudentOrParent = targetUser.role === 'STUDENT' || targetUser.role === 'PARENT'

  // Fetch all parents and students in the school for the link form
  let allParents: { id: string; name: string; email: string }[] = []
  let allStudents: { id: string; name: string; email: string }[] = []

  if (isStudentOrParent) {
    ;[allParents, allStudents] = await Promise.all([
      prisma.user.findMany({
        where: { schoolId: adminUser.schoolId, role: 'PARENT' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { schoolId: adminUser.schoolId, role: 'STUDENT' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ])
  }

  // Build existing links and available users for the linker component
  const existingLinks =
    targetUser.role === 'STUDENT'
      ? targetUser.parents.map((ps) => ({
          id: ps.id,
          linkedUser: ps.parent,
        }))
      : targetUser.children.map((ps) => ({
          id: ps.id,
          linkedUser: ps.student,
        }))

  const linkedUserIds = new Set(existingLinks.map((l) => l.linkedUser.id))

  const availableUsers =
    targetUser.role === 'STUDENT'
      ? allParents.filter((p) => !linkedUserIds.has(p.id))
      : allStudents.filter((s) => !linkedUserIds.has(s.id))

  const trackLabels: Record<string, string> = { STANDARD: 'Standard', PREAP: 'Pre-AP', AP: 'AP' }

  return (
    <div className="space-y-8">
      <PageHeader
        title={targetUser.name}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Users', href: '/dashboard/admin/users' },
        ]}
      />

      {/* User info card */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm">User Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
              {targetUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RoleBadge role={targetUser.role as 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'} />
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    targetUser.active
                      ? 'bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400'
                      : 'bg-destructive/10 text-destructive ring-destructive/20'
                  }`}
                >
                  {targetUser.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {targetUser.email}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Joined {new Date(targetUser.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family links section — only for STUDENT and PARENT */}
      {isStudentOrParent && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm">
              {targetUser.role === 'STUDENT' ? 'Linked Parents' : 'Linked Students'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ParentStudentLinker
              userId={targetUser.id}
              userRole={targetUser.role as 'STUDENT' | 'PARENT'}
              existingLinks={existingLinks}
              availableUsers={availableUsers}
            />
          </CardContent>
        </Card>
      )}

      {/* Course memberships */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Course Enrollments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {targetUser.memberships.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              Not enrolled in any courses.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {targetUser.memberships.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.course?.name ?? 'Unknown course'}
                    </p>
                    {m.course && (
                      <p className="text-xs text-muted-foreground">
                        Grade {m.course.gradeLevel} &middot;{' '}
                        {trackLabels[m.course.track] ?? m.course.track}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-primary/10 text-primary ring-primary/20">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
