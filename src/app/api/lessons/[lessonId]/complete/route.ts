import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

type Params = Promise<{ lessonId: string }>

export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  const { lessonId } = await params
  const log = apiLogger('POST /api/lessons/[lessonId]/complete', { lessonId })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    log.warn('Unauthenticated request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) {
    log.warn('No db user found', { supabaseId: user.id })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (dbUser.role !== 'STUDENT') {
    log.warn('Non-student attempted lesson completion', { role: dbUser.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { score?: number } = {}
  try {
    body = await req.json()
  } catch {
    // score is optional — an empty or missing body is fine
  }

  // Verify lesson belongs to user's school
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      week: {
        theme: {
          course: { schoolId: dbUser.schoolId },
        },
      },
    },
    select: { id: true },
  })
  if (!lesson) {
    log.warn('Lesson not found or school mismatch', { lessonId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  try {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: dbUser.id,
          lessonId,
        },
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(body.score !== undefined ? { score: body.score } : {}),
      },
      create: {
        userId: dbUser.id,
        lessonId,
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(body.score !== undefined ? { score: body.score } : {}),
      },
    })
  } catch (err) {
    log.error('Failed to upsert lesson progress', err, { lessonId, userId: dbUser.id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  log.info('Lesson marked complete', { lessonId, userId: dbUser.id, score: body.score })

  // Auto-complete week when all published lessons in this week are done
  try {
    // Find which week this lesson belongs to
    const lessonWeek = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { weekId: true },
    })

    if (lessonWeek) {
      const { weekId } = lessonWeek

      // Count published lessons vs completed by this student in parallel
      const [totalPublished, completedCount] = await Promise.all([
        prisma.lesson.count({
          where: { weekId, published: true },
        }),
        prisma.lessonProgress.count({
          where: {
            userId: dbUser.id,
            lesson: { weekId, published: true },
            status: 'COMPLETED',
          },
        }),
      ])

      if (totalPublished > 0 && completedCount >= totalPublished) {
        // All published lessons in this week are complete — find the week's courseId
        const weekRecord = await prisma.week.findUnique({
          where: { id: weekId },
          select: { courseId: true },
        })

        if (weekRecord?.courseId) {
          const { courseId } = weekRecord

          // StudentProgress has no @@unique, so use findFirst + create/update
          const existingWeekProgress = await prisma.studentProgress.findFirst({
            where: { userId: dbUser.id, weekId, courseId },
          })

          if (existingWeekProgress) {
            await prisma.studentProgress.update({
              where: { id: existingWeekProgress.id },
              data: { status: 'COMPLETED', completedAt: new Date() },
            })
          } else {
            await prisma.studentProgress.create({
              data: {
                userId: dbUser.id,
                weekId,
                courseId,
                status: 'COMPLETED',
                completedAt: new Date(),
              },
            })
          }

          log.info('Week auto-completed', { weekId, courseId, userId: dbUser.id })
        }
      }
    }
  } catch (err) {
    // Non-fatal — lesson completion was already recorded above
    log.error('Failed to auto-complete week', err, { lessonId, userId: dbUser.id })
  }

  return NextResponse.json({ ok: true })
}
