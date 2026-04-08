import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

// ─── POST /api/parent-student ──────────────────────────────────────────────
// Link a parent to a student. Admin only.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { parentId?: string; studentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { parentId, studentId } = body
  if (!parentId || !studentId) {
    return NextResponse.json({ error: 'Missing parentId or studentId' }, { status: 400 })
  }

  // Validate both users exist in the same school
  const [parent, student] = await Promise.all([
    prisma.user.findFirst({
      where: { id: parentId, schoolId: dbUser.schoolId },
      select: { id: true, role: true, name: true },
    }),
    prisma.user.findFirst({
      where: { id: studentId, schoolId: dbUser.schoolId },
      select: { id: true, role: true, name: true },
    }),
  ])

  if (!parent) return NextResponse.json({ error: 'Parent user not found in this school' }, { status: 404 })
  if (!student) return NextResponse.json({ error: 'Student user not found in this school' }, { status: 404 })

  if (parent.role !== 'PARENT') {
    return NextResponse.json({ error: 'User designated as parent does not have PARENT role' }, { status: 400 })
  }
  if (student.role !== 'STUDENT') {
    return NextResponse.json({ error: 'User designated as student does not have STUDENT role' }, { status: 400 })
  }

  // Check for existing link (prevent @@unique violation)
  const existing = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  })
  if (existing) {
    return NextResponse.json({ error: 'This parent-student link already exists' }, { status: 409 })
  }

  const link = await prisma.parentStudent.create({
    data: { parentId, studentId },
    select: { id: true, parentId: true, studentId: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      action: 'PARENT_LINKED',
      details: `parentId:${parentId} ↔ studentId:${studentId}`,
    },
  })

  return NextResponse.json({ ok: true, link }, { status: 201 })
}

// ─── DELETE /api/parent-student ────────────────────────────────────────────
// Unlink a parent from a student. Admin only.
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { parentStudentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { parentStudentId } = body
  if (!parentStudentId) {
    return NextResponse.json({ error: 'Missing parentStudentId' }, { status: 400 })
  }

  // Fetch the link and verify both users belong to admin's school
  const link = await prisma.parentStudent.findUnique({
    where: { id: parentStudentId },
    select: {
      id: true,
      parentId: true,
      studentId: true,
      parent: { select: { schoolId: true } },
      student: { select: { schoolId: true } },
    },
  })

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
  if (link.parent.schoolId !== dbUser.schoolId || link.student.schoolId !== dbUser.schoolId) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  await prisma.parentStudent.delete({ where: { id: parentStudentId } })

  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      action: 'PARENT_UNLINKED',
      details: `parentId:${link.parentId} ↔ studentId:${link.studentId}`,
    },
  })

  return NextResponse.json({ ok: true })
}
