import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { AppSidebar } from '@/components/AppSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      name: true,
      role: true,
      school: { select: { name: true } },
    },
  })

  if (!dbUser) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        role={dbUser.role}
        userName={dbUser.name}
        schoolName={dbUser.school.name}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
