import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

export async function POST(req: NextRequest) {
  const log = apiLogger('POST /api/lessons')

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
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    log.warn('Insufficient role', { role: dbUser.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    weekId?: string
    title?: string
    type?: string
    content?: unknown
    order?: number
    durationMin?: number
  }
  try {
    body = await req.json()
  } catch {
    log.warn('Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { weekId, title, type, content, order, durationMin } = body

  if (!weekId || typeof weekId !== 'string') {
    return NextResponse.json({ error: 'weekId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const validTypes = ['VIDEO', 'PDF', 'TEXT', 'LINK', 'QUIZ']
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    )
  }

  if (content === undefined || content === null) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  // Verify week belongs to user's school
  const week = await prisma.week.findFirst({
    where: { id: weekId },
    include: {
      theme: {
        include: {
          course: { select: { schoolId: true } },
        },
      },
    },
  })
  if (!week || week.theme.course.schoolId !== dbUser.schoolId) {
    log.warn('Week not found or school mismatch', { weekId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }

  // Determine order: use provided value, or max existing order + 1
  let lessonOrder = order
  if (lessonOrder === undefined || lessonOrder === null) {
    const maxLesson = await prisma.lesson.findFirst({
      where: { weekId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    lessonOrder = maxLesson ? maxLesson.order + 1 : 1
  }

  let lesson
  try {
    lesson = await prisma.lesson.create({
      data: {
        weekId,
        title: title.trim(),
        type: type as 'VIDEO' | 'PDF' | 'TEXT' | 'LINK' | 'QUIZ',
        content: content as object,
        order: lessonOrder,
        published: false,
        ...(durationMin !== undefined ? { durationMin } : {}),
      },
    })
  } catch (err) {
    log.error('Failed to create lesson', err, { weekId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  log.info('Lesson created', { lessonId: lesson.id, weekId, type })
  return NextResponse.json(lesson, { status: 201 })
}
