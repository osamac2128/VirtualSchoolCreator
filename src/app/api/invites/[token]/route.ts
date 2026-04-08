import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ token: string }> }

// GET — validate invite token (public, no auth required)
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params

  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expiresAt: true,
      usedAt: true,
      school: { select: { name: true } },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }
  if (invite.usedAt !== null) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    schoolName: invite.school.name,
  })
}

// POST — accept invite (provision user after Supabase sign-up)
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params

  let body: { supabaseId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { supabaseId } = body
  if (!supabaseId || typeof supabaseId !== 'string') {
    return NextResponse.json({ error: 'supabaseId is required' }, { status: 400 })
  }

  // Re-validate token is still valid
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      schoolId: true,
      expiresAt: true,
      usedAt: true,
    },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }
  if (invite.usedAt !== null) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Check if a User with this supabaseId already exists (idempotency guard)
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true },
  })
  if (existingUser) {
    return NextResponse.json({ ok: true, userId: existingUser.id })
  }

  // Create User and mark invite used in a transaction.
  // The updateMany with usedAt: null condition is the atomic guard against
  // concurrent acceptance of the same token (TOCTOU protection).
  const result = await prisma.$transaction(async (tx) => {
    // Atomically claim the invite — only succeeds if usedAt is still null
    const claimed = await tx.invite.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (claimed.count === 0) {
      throw new Error('INVITE_ALREADY_USED')
    }

    const user = await tx.user.create({
      data: {
        supabaseId,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        schoolId: invite.schoolId,
        active: true,
      },
      select: { id: true },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_INVITED',
        details: `"${invite.name}" joined as ${invite.role}`,
      },
    })

    return user
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === 'INVITE_ALREADY_USED') {
      return null
    }
    throw err
  })

  if (!result) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  }

  return NextResponse.json({ ok: true, userId: result.id }, { status: 201 })
}
