import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { schoolId: true },
  })

  if (!dbUser) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
  }

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: dbUser.schoolId },
    select: { status: true, errorMessage: true, name: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: course.status,
    errorMessage: course.errorMessage,
    name: course.name,
  })
}
