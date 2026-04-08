import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

type AnswerInput = {
  text: string
  isCorrect: boolean
}

type QuestionInput = {
  text: string
  type?: string
  order: number
  answers: AnswerInput[]
}

export async function POST(req: NextRequest) {
  const log = apiLogger('POST /api/quizzes')

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
    lessonId?: string
    title?: string
    questions?: QuestionInput[]
  }
  try {
    body = await req.json()
  } catch {
    log.warn('Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { lessonId, title, questions } = body

  if (!lessonId || typeof lessonId !== 'string') {
    return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'questions must be a non-empty array' }, { status: 400 })
  }

  // Validate each question has at least one correct answer
  const validQuestionTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE']
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
      return NextResponse.json({ error: `questions[${i}].text is required` }, { status: 400 })
    }
    if (q.type !== undefined && !validQuestionTypes.includes(q.type)) {
      return NextResponse.json(
        { error: `questions[${i}].type must be one of: ${validQuestionTypes.join(', ')}` },
        { status: 400 },
      )
    }
    if (!Array.isArray(q.answers) || q.answers.length === 0) {
      return NextResponse.json(
        { error: `questions[${i}].answers must be a non-empty array` },
        { status: 400 },
      )
    }
    const hasCorrect = q.answers.some((a) => a.isCorrect === true)
    if (!hasCorrect) {
      return NextResponse.json(
        { error: `questions[${i}] must have at least one correct answer` },
        { status: 400 },
      )
    }
  }

  // Verify lesson belongs to user's school and is QUIZ type
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      week: {
        theme: {
          course: { schoolId: dbUser.schoolId },
        },
      },
    },
    select: { id: true, type: true },
  })
  if (!lesson) {
    log.warn('Lesson not found or school mismatch', { lessonId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }
  if (lesson.type !== 'QUIZ') {
    log.warn('Lesson is not QUIZ type', { lessonId, type: lesson.type })
    return NextResponse.json({ error: 'Lesson type must be QUIZ' }, { status: 400 })
  }

  // Create quiz + questions + answers in a single transaction
  let quiz
  try {
    quiz = await prisma.$transaction(async (tx) => {
      const created = await tx.quiz.create({
        data: {
          lessonId,
          title: title.trim(),
          questions: {
            create: questions.map((q) => ({
              text: q.text.trim(),
              type: (q.type ?? 'MULTIPLE_CHOICE') as 'MULTIPLE_CHOICE' | 'TRUE_FALSE',
              order: q.order,
              answers: {
                create: q.answers.map((a) => ({
                  text: a.text,
                  isCorrect: a.isCorrect,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { answers: true },
          },
        },
      })
      return created
    })
  } catch (err) {
    log.error('Failed to create quiz in transaction', err, { lessonId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  log.info('Quiz created', { quizId: quiz.id, lessonId, questionCount: questions.length })
  return NextResponse.json(quiz, { status: 201 })
}
