import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

// ─── GET /api/enrollments?courseId=X ───────────────────────────────────────
// Returns enrollments for a course. Admin or Teacher of that school only.
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role !== 'ADMIN' && dbUser.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId query parameter' }, { status: 400 })
  }

  // Verify course belongs to the admin/teacher's school
  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: dbUser.schoolId },
    select: { id: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const enrollments = await prisma.membership.findMany({
    where: { courseId },
    select: {
      id: true,
      userId: true,
      role: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  })

  return NextResponse.json({ enrollments })
}

// ─── POST /api/enrollments ─────────────────────────────────────────────────
// Enroll a user in a course. Admin only.
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

  let body: { courseId?: string; userId?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { courseId, userId, role } = body
  if (!courseId || !userId || !role) {
    return NextResponse.json({ error: 'Missing courseId, userId, or role' }, { status: 400 })
  }
  if (role !== 'STUDENT' && role !== 'TEACHER') {
    return NextResponse.json({ error: 'role must be STUDENT or TEACHER' }, { status: 400 })
  }

  // Verify course belongs to admin's school
  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: dbUser.schoolId },
    select: { id: true, totalWeeks: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Verify target user belongs to the same school
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, schoolId: dbUser.schoolId },
    select: { id: true },
  })
  if (!targetUser) return NextResponse.json({ error: 'Target user not found in this school' }, { status: 404 })

  // Check for existing membership (prevent duplicates)
  const existing = await prisma.membership.findFirst({
    where: { userId, courseId },
  })
  if (existing) {
    return NextResponse.json({ error: 'User is already enrolled in this course' }, { status: 409 })
  }

  // Create membership and, for STUDENT role, seed StudentProgress for every week
  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.membership.create({
      data: {
        userId,
        courseId,
        role: role as 'STUDENT' | 'TEACHER',
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        role: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (role === 'STUDENT') {
      // Fetch all weeks for this course
      const weeks = await tx.week.findMany({
        where: { courseId },
        select: { id: true },
      })

      if (weeks.length > 0) {
        await tx.studentProgress.createMany({
          data: weeks.map((week) => ({
            userId,
            weekId: week.id,
            courseId,
            status: 'NOT_STARTED' as const,
          })),
          skipDuplicates: true,
        })
      }
    }

    return created
  })

  return NextResponse.json({ membership }, { status: 201 })
}

// ─── DELETE /api/enrollments ───────────────────────────────────────────────
// Remove an enrollment. Admin only.
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

  let body: { membershipId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { membershipId } = body
  if (!membershipId) {
    return NextResponse.json({ error: 'Missing membershipId' }, { status: 400 })
  }

  // Verify the membership belongs to a course in this admin's school
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId },
    select: {
      id: true,
      courseId: true,
      course: { select: { schoolId: true } },
    },
  })

  if (!membership || membership.course?.schoolId !== dbUser.schoolId) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  await prisma.membership.delete({ where: { id: membershipId } })

  return NextResponse.json({ success: true })
}
