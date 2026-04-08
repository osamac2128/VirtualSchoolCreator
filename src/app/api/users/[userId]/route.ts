import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'

type RouteContext = { params: Promise<{ userId: string }> }

// ─── PATCH /api/users/[userId] ─────────────────────────────────────────────
// Update a user's role, active status, or name. Admin only, school-scoped.
export async function PATCH(req: Request, { params }: RouteContext) {
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

  let body: { role?: string; active?: boolean; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Cannot deactivate yourself
  if (userId === dbUser.id && body.active === false) {
    return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 403 })
  }

  // Cannot set anyone to ADMIN role
  if (body.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot assign ADMIN role via this endpoint' }, { status: 403 })
  }

  // Validate role value if provided
  if (body.role !== undefined && !['TEACHER', 'STUDENT', 'PARENT'].includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role value' }, { status: 400 })
  }

  // Fetch target user — must be in same school
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, schoolId: dbUser.schoolId },
    select: { id: true, name: true, email: true, supabaseId: true, active: true, role: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in this school' }, { status: 404 })
  }

  const changes: Record<string, unknown> = {}
  if (body.role !== undefined) changes.role = body.role
  if (body.active !== undefined) changes.active = body.active
  if (body.name !== undefined) changes.name = body.name

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Handle Supabase ban/unban when active status changes
  if (body.active !== undefined && body.active !== targetUser.active) {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const banDuration = body.active === false ? '876600h' : 'none'
    const { error: banError } = await adminSupabase.auth.admin.updateUserById(
      targetUser.supabaseId,
      { ban_duration: banDuration },
    )
    if (banError) {
      console.error('[PATCH /api/users/[userId]] Supabase ban error:', banError)
      return NextResponse.json({ error: 'Failed to update auth status' }, { status: 500 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: changes,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      action: 'USER_UPDATED',
      details: `"${targetUser.name}" - ${JSON.stringify(changes)}`,
    },
  })

  return NextResponse.json({ user: updated })
}
