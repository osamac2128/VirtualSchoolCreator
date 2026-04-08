import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id },
          select: { active: true },
        })

        if (dbUser) {
          if (dbUser.active) {
            return NextResponse.redirect(`${origin}${next}`)
          } else {
            return NextResponse.redirect(`${origin}/login?error=deactivated`)
          }
        }
        // No Prisma record — user must complete invite flow or wait for provisioning
        return NextResponse.redirect(`${origin}/pending`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
