import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { School, Globe, Calendar } from 'lucide-react'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { school: true },
  })
  if (!dbUser) redirect('/login')

  const { school } = dbUser

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="School configuration"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard/admin' }]}
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <School className="h-4 w-4 text-primary" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground">School Name</p>
                <p className="mt-0.5 font-medium text-foreground">{school.name}</p>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground">School ID</p>
                <p className="mt-0.5 font-mono text-sm text-foreground">{school.id}</p>
              </div>
              {school.domain && (
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" /> Domain
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{school.domain}</p>
                </div>
              )}
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Created
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {new Date(school.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
