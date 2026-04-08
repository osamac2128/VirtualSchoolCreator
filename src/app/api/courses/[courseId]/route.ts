import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { sanitizeText, isValidTrack } from '@/lib/security/sanitize'

type RouteContext = { params: Promise<{ courseId: string }> }

async function getAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, schoolId: true, role: true },
  })
  if (!dbUser || dbUser.role !== 'ADMIN') return null
  return dbUser
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const dbUser = await getAdminUser()
  if (!dbUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  // Check the course belongs to admin's school
  const existing = await prisma.course.findFirst({
    where: { id: courseId, schoolId: dbUser.schoolId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = sanitizeText(String(body.name), 200)
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }
    updates.name = name
  }

  if (body.gradeLevel !== undefined) {
    const grade = Number(body.gradeLevel)
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
      return NextResponse.json({ error: 'gradeLevel must be between 1 and 12' }, { status: 400 })
    }
    updates.gradeLevel = grade
  }

  if (body.track !== undefined) {
    const track = sanitizeText(String(body.track), 20)
    if (!isValidTrack(track)) {
      return NextResponse.json({ error: 'Invalid track value' }, { status: 400 })
    }
    updates.track = track
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: updates,
  })

  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      action: 'COURSE_UPDATED',
      details: `Updated course "${updated.name}" (${courseId}): ${Object.keys(updates).join(', ')}`,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const dbUser = await getAdminUser()
  if (!dbUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: dbUser.schoolId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      action: 'COURSE_DELETED',
      details: `"${course.name}"`,
    },
  })

  return NextResponse.json({ ok: true })
}
