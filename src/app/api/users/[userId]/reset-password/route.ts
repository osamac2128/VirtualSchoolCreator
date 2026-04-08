import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

type RouteContext = { params: Promise<{ userId: string }> }

// ─── POST /api/users/[userId]/reset-password ───────────────────────────────
// Send a password reset email to a user. Admin only.
export async function POST(_req: Request, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, schoolId: dbUser.schoolId },
    select: { id: true, name: true, email: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in this school' }, { status: 404 })
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: targetUser.email,
  })

  if (linkError || !linkData?.properties.action_link) {
    console.error('[POST /api/users/[userId]/reset-password] generateLink error:', linkError)
    return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
  }

  const resetLink = linkData.properties.action_link

  await sendEmail({
    to: targetUser.email,
    subject: 'Reset your password',
    html: `
      <p>Hi ${targetUser.name},</p>
      <p>An administrator has requested a password reset for your account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  })

  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      action: 'USER_UPDATED',
      details: `"${targetUser.name}" - password reset email sent`,
    },
  })

  return NextResponse.json({ ok: true })
}
