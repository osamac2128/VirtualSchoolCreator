import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { DashboardShell } from '@/components/DashboardShell'

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
    redirect('/pending')
  }

  return (
    <DashboardShell
      role={dbUser.role}
      userName={dbUser.name}
      schoolName={dbUser.school.name}
    >
      {children}
    </DashboardShell>
  )
}
