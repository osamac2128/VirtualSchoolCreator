import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

type Params = Promise<{ lessonId: string }>

async function getAuthedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  return dbUser ?? null
}

async function getLessonInSchool(lessonId: string, schoolId: string) {
  return prisma.lesson.findFirst({
    where: {
      id: lessonId,
      week: {
        theme: {
          course: { schoolId },
        },
      },
    },
  })
}

// GET — fetch lesson with quiz/questions/answers (teacher authoring view)
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { lessonId } = await params
  const log = apiLogger('GET /api/lessons/[lessonId]', { lessonId })

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

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      week: {
        theme: {
          course: { schoolId: dbUser.schoolId },
        },
      },
    },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: true,
            },
          },
        },
      },
    },
  })

  if (!lesson) {
    log.warn('Lesson not found or school mismatch', { lessonId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  log.info('Lesson fetched', { lessonId })
  return NextResponse.json(lesson)
}

// PATCH — update lesson fields (teacher/admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Params },
) {
  const { lessonId } = await params
  const log = apiLogger('PATCH /api/lessons/[lessonId]', { lessonId })

  const dbUser = await getAuthedUser()
  if (!dbUser) {
    log.warn('Unauthenticated or missing db user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    log.warn('Insufficient role', { role: dbUser.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await getLessonInSchool(lessonId, dbUser.schoolId)
  if (!lesson) {
    log.warn('Lesson not found or school mismatch', { lessonId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  let body: {
    title?: string
    type?: string
    content?: unknown
    order?: number
    published?: boolean
    durationMin?: number | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, type, content, order, published, durationMin } = body

  const validTypes = ['VIDEO', 'PDF', 'TEXT', 'LINK', 'QUIZ']
  if (type !== undefined && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    )
  }
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(type !== undefined ? { type: type as 'VIDEO' | 'PDF' | 'TEXT' | 'LINK' | 'QUIZ' } : {}),
      ...(content !== undefined ? { content: content as object } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(published !== undefined ? { published } : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
    },
  })

  log.info('Lesson updated', { lessonId })
  return NextResponse.json(updated)
}

// DELETE — remove lesson (teacher/admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { lessonId } = await params
  const log = apiLogger('DELETE /api/lessons/[lessonId]', { lessonId })

  const dbUser = await getAuthedUser()
  if (!dbUser) {
    log.warn('Unauthenticated or missing db user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    log.warn('Insufficient role', { role: dbUser.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await getLessonInSchool(lessonId, dbUser.schoolId)
  if (!lesson) {
    log.warn('Lesson not found or school mismatch', { lessonId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  await prisma.lesson.delete({ where: { id: lessonId } })

  log.info('Lesson deleted', { lessonId })
  return NextResponse.json({ ok: true })
}
