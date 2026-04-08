import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import SignOutButton from '@/components/SignOutButton'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  })

  if (dbUser) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8 rounded-lg border border-border bg-card shadow-sm text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Account Pending Activation</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Your account has not been provisioned yet. Please contact your school administrator
          to have your account activated before you can access the platform.
        </p>

        <SignOutButton />
      </div>
    </div>
  )
}
