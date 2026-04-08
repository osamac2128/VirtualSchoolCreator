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
  return NextResponse.json({ ok: true })
}
