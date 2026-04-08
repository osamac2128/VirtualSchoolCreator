import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { weekId?: string; courseId?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { weekId, courseId, status } = body
  if (!weekId || !courseId || !status) {
    return NextResponse.json({ error: 'Missing weekId, courseId, or status' }, { status: 400 })
  }

  const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Verify the student is enrolled in this course
  const membership = await prisma.membership.findFirst({
    where: { userId: dbUser.id, courseId, role: 'STUDENT' },
  })
  if (!membership) return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })

  // Verify the week belongs to the course (and same school for safety)
  const week = await prisma.week.findFirst({
    where: { id: weekId, courseId },
    include: { theme: { include: { course: { select: { schoolId: true } } } } },
  })
  if (!week || week.theme.course.schoolId !== dbUser.schoolId) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }

  const existing = await prisma.studentProgress.findFirst({
    where: { userId: dbUser.id, weekId, courseId },
  })

  if (existing) {
    await prisma.studentProgress.update({
      where: { id: existing.id },
      data: {
        status: status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    })
  } else {
    await prisma.studentProgress.create({
      data: {
        userId: dbUser.id,
        weekId,
        courseId,
        status: status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    })
  }

  return NextResponse.json({ success: true })
}
