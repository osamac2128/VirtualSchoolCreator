import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { RoleBadge } from '@/components/RoleBadge'
import { PendingInvitesList } from '@/components/PendingInvitesList'
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
    select: { schoolId: true },
  })
  if (!dbUser) redirect('/login')

  const users = await prisma.user.findMany({
    where: { schoolId: dbUser.schoolId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, email: true, role: true, createdAt: true },
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
                      <li key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {u.email}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <RoleBadge role={u.role as 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'} />
                        </div>
                        <p className="hidden flex-shrink-0 text-xs text-muted-foreground sm:block">
                          Joined {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </li>
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
