import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { PendingInvitesList } from '@/components/PendingInvitesList'
import { UserManagementRow } from '@/components/UserManagementRow'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { Users, Mail, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) redirect('/login')
  if (dbUser.role !== 'ADMIN') redirect('/dashboard/admin')

  const users = await prisma.user.findMany({
    where: { schoolId: dbUser.schoolId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  const byRole = {
    ADMIN:   users.filter(u => u.role === 'ADMIN'),
    TEACHER: users.filter(u => u.role === 'TEACHER'),
    STUDENT: users.filter(u => u.role === 'STUDENT'),
    PARENT:  users.filter(u => u.role === 'PARENT'),
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        subtitle={`${users.length} user${users.length !== 1 ? 's' : ''} in your school`}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard/admin' }]}
        action={
          <Link
            href="/dashboard/admin/users/invite"
            className={buttonVariants({ variant: 'default', size: 'default' })}
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </Link>
        }
      />

      <div className="space-y-8">
        {(Object.entries(byRole) as [string, typeof users][]).map(([role, roleUsers]) => {
          if (roleUsers.length === 0) return null
          return (
            <section key={role}>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  {role}S ({roleUsers.length})
                </h2>
              </div>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {roleUsers.map((u) => (
                      <UserManagementRow
                        key={u.id}
                        user={{
                          ...u,
                          createdAt: u.createdAt.toISOString(),
                        }}
                        isCurrentUser={u.id === dbUser.id}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )
        })}
      </div>

      {/* Pending Invites */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Pending Invites
          </h2>
        </div>
        <PendingInvitesList />
      </section>
    </div>
  )
}
