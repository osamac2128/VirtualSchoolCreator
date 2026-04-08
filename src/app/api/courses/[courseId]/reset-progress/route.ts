import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

type Params = Promise<{ courseId: string }>

/**
 * DELETE /api/courses/[courseId]/reset-progress?userId=<targetUserId>
 *
 * Admin-only endpoint. Resets all StudentProgress and LessonProgress records
 * for a given student on a given course. Writes an AuditLog entry.
 *
 * Query params:
 *   userId — the student whose progress should be reset
 *
 * Returns:
 *   { ok: true, deletedWeekProgress: number, deletedLessonProgress: number }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params },
) {
  const { courseId } = await params
  const log = apiLogger('DELETE /api/courses/[courseId]/reset-progress', { courseId })

  // --- Auth: admin only ---
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    log.warn('Unauthenticated request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!adminUser) {
    log.warn('No db user found', { supabaseId: user.id })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (adminUser.role !== 'ADMIN') {
    log.warn('Non-admin attempted progress reset', { role: adminUser.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // --- Validate query param ---
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing required query param: userId' }, { status: 400 })
  }

  // --- Verify course belongs to the admin's school ---
  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: adminUser.schoolId },
    select: { id: true },
  })
  if (!course) {
    log.warn('Course not found or school mismatch', { courseId, schoolId: adminUser.schoolId })
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // --- Verify target user belongs to the same school ---
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, schoolId: adminUser.schoolId },
    select: { id: true, role: true },
  })
  if (!targetUser) {
    log.warn('Target user not found or school mismatch', { targetUserId, schoolId: adminUser.schoolId })
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // --- Gather all lesson IDs for this course ---
  const weekRecords = await prisma.week.findMany({
    where: { courseId },
    select: { id: true },
  })
  const weekIds = weekRecords.map((w) => w.id)

  const lessonRecords = await prisma.lesson.findMany({
    where: { weekId: { in: weekIds } },
    select: { id: true },
  })
  const lessonIds = lessonRecords.map((l) => l.id)

  // --- Delete progress records ---
  const [deletedLessonResult, deletedWeekResult] = await Promise.all([
    prisma.lessonProgress.deleteMany({
      where: { userId: targetUserId, lessonId: { in: lessonIds } },
    }),
    prisma.studentProgress.deleteMany({
      where: { userId: targetUserId, courseId },
    }),
  ])

  const deletedLessonProgress = deletedLessonResult.count
  const deletedWeekProgress = deletedWeekResult.count

  // --- Write audit log ---
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'PROGRESS_RESET',
      details: `Progress reset for userId:${targetUserId} on courseId:${courseId} — deleted ${deletedWeekProgress} week record(s) and ${deletedLessonProgress} lesson record(s)`,
    },
  })

  log.info('Progress reset complete', {
    adminId: adminUser.id,
    targetUserId,
    courseId,
    deletedWeekProgress,
    deletedLessonProgress,
  })

  return NextResponse.json({ ok: true, deletedWeekProgress, deletedLessonProgress })
}
