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
// Enroll one or more users in a course. Admin only.
// Single:  { courseId, userId, role }
// Bulk:    { courseId, userIds: string[], role }
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

  let body: { courseId?: string; userId?: string; userIds?: string[]; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { courseId, role } = body

  if (!courseId || !role) {
    return NextResponse.json({ error: 'Missing courseId or role' }, { status: 400 })
  }
  if (role !== 'STUDENT' && role !== 'TEACHER') {
    return NextResponse.json({ error: 'role must be STUDENT or TEACHER' }, { status: 400 })
  }

  // Determine target user IDs (single or bulk)
  let targetUserIds: string[]
  if (Array.isArray(body.userIds) && body.userIds.length > 0) {
    targetUserIds = body.userIds
  } else if (body.userId) {
    targetUserIds = [body.userId]
  } else {
    return NextResponse.json({ error: 'Missing userId or userIds' }, { status: 400 })
  }

  // Verify course belongs to admin's school
  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: dbUser.schoolId },
    select: { id: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Verify all target users belong to the same school
  const schoolUsers = await prisma.user.findMany({
    where: { id: { in: targetUserIds }, schoolId: dbUser.schoolId },
    select: { id: true },
  })
  const validUserIds = new Set(schoolUsers.map((u) => u.id))
  const invalidIds = targetUserIds.filter((id) => !validUserIds.has(id))
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Users not found in this school: ${invalidIds.join(', ')}` },
      { status: 404 },
    )
  }

  // Check for existing memberships to skip duplicates
  const existingMemberships = await prisma.membership.findMany({
    where: { userId: { in: targetUserIds }, courseId },
    select: { userId: true },
  })
  const alreadyEnrolled = new Set(existingMemberships.map((m) => m.userId))
  const toEnroll = targetUserIds.filter((id) => !alreadyEnrolled.has(id))

  if (toEnroll.length === 0) {
    // All were already enrolled — single enrollment returns 409, bulk returns counts
    if (targetUserIds.length === 1) {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 409 },
      )
    }
    return NextResponse.json({ enrolled: 0, skipped: targetUserIds.length })
  }

  // Fetch weeks once for StudentProgress seeding
  const weeks = await prisma.week.findMany({
    where: { courseId },
    select: { id: true },
  })

  // Enroll in a transaction
  const result = await prisma.$transaction(async (tx) => {
    let enrolledCount = 0

    for (const uid of toEnroll) {
      await tx.membership.create({
        data: { userId: uid, courseId, role: role as 'STUDENT' | 'TEACHER' },
      })
      enrolledCount++

      if (role === 'STUDENT' && weeks.length > 0) {
        await tx.studentProgress.createMany({
          data: weeks.map((week) => ({
            userId: uid,
            weekId: week.id,
            courseId,
            status: 'NOT_STARTED' as const,
          })),
          skipDuplicates: true,
        })
      }
    }

    return enrolledCount
  })

  // For single enrollment, return the membership object for backwards compatibility
  if (targetUserIds.length === 1 && result === 1) {
    const membership = await prisma.membership.findFirst({
      where: { userId: toEnroll[0], courseId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        role: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    return NextResponse.json({ membership }, { status: 201 })
  }

  return NextResponse.json(
    { enrolled: result, skipped: alreadyEnrolled.size },
    { status: 201 },
  )
}

// ─── DELETE /api/enrollments ───────────────────────────────────────────────
// Remove an enrollment and cascade-delete associated progress. Admin only.
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
      userId: true,
      courseId: true,
      course: { select: { schoolId: true } },
    },
  })

  if (!membership || membership.course?.schoolId !== dbUser.schoolId) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  // Delete membership and cascade orphaned progress in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membershipId } })

    if (membership.courseId) {
      const weekRecords = await tx.week.findMany({
        where: { courseId: membership.courseId },
        select: { id: true },
      })
      const weekIds = weekRecords.map((w) => w.id)

      const lessonRecords = await tx.lesson.findMany({
        where: { weekId: { in: weekIds } },
        select: { id: true },
      })
      const lessonIds = lessonRecords.map((l) => l.id)

      await tx.lessonProgress.deleteMany({
        where: { userId: membership.userId, lessonId: { in: lessonIds } },
      })
      await tx.studentProgress.deleteMany({
        where: { userId: membership.userId, courseId: membership.courseId },
      })
    }
  })

  return NextResponse.json({ success: true })
}
