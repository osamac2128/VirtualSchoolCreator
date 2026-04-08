import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const VALID_ROLES = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as const
type ValidRole = (typeof VALID_ROLES)[number]

async function getAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true, schoolId: true },
  })
  if (!dbUser || dbUser.role !== 'ADMIN') return null
  return dbUser
}

// POST — admin creates an invite
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { email?: unknown; role?: unknown; name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, role, name } = body

  // Validate email
  if (
    !email ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  // Validate role
  if (!role || typeof role !== 'string' || !VALID_ROLES.includes(role as ValidRole)) {
    return NextResponse.json(
      { error: `Role must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const emailTrimmed = email.trim().toLowerCase()
  const nameTrimmed = name.trim()

  // Check no active user with this email in school
  const existing = await prisma.user.findFirst({
    where: { email: emailTrimmed, schoolId: admin.schoolId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'A user with this email already exists in your school' },
      { status: 409 }
    )
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.invite.create({
    data: {
      email: emailTrimmed,
      role: role as ValidRole,
      name: nameTrimmed,
      schoolId: admin.schoolId,
      expiresAt,
    },
    select: { id: true, email: true, role: true, name: true, expiresAt: true, token: true },
  })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`

  await sendEmail({
    to: invite.email,
    subject: 'You have been invited to Virtual School Creator',
    html: `
      <p>Hi ${invite.name},</p>
      <p>You have been invited to join Virtual School Creator as a <strong>${invite.role}</strong>.</p>
      <p>Click the link below to create your account. This link expires in 7 days.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  })

  return NextResponse.json({ invite }, { status: 201 })
}

// GET — list pending invites for admin's school
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invites = await prisma.invite.findMany({
    where: {
      schoolId: admin.schoolId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invites })
}

// DELETE — revoke an invite
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { inviteId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { inviteId } = body
  if (!inviteId || typeof inviteId !== 'string') {
    return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
  }

  // Verify invite belongs to admin's school
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, schoolId: admin.schoolId },
    select: { id: true },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  await prisma.invite.delete({ where: { id: inviteId } })

  return NextResponse.json({ ok: true })
}
