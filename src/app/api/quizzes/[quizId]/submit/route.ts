import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

type Params = Promise<{ quizId: string }>

export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  const { quizId } = await params
  const log = apiLogger('POST /api/quizzes/[quizId]/submit', { quizId })

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
    log.warn('Non-student attempted quiz submission', { role: dbUser.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { answers?: Record<string, string> }
  try {
    body = await req.json()
  } catch {
    log.warn('Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answers } = body
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json(
      { error: 'answers must be an object mapping questionId to answerId' },
      { status: 400 },
    )
  }

  // Load quiz with questions + answers, verify it belongs to user's school
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      lesson: {
        week: {
          theme: {
            course: { schoolId: dbUser.schoolId },
          },
        },
      },
    },
    include: {
      lesson: { select: { id: true } },
      questions: {
        include: { answers: true },
      },
    },
  })
  if (!quiz) {
    log.warn('Quiz not found or school mismatch', { quizId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const total = quiz.questions.length
  if (total === 0) {
    log.warn('Quiz has no questions', { quizId })
    return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })
  }

  // Grade each question
  let correct = 0
  const results = quiz.questions.map((question) => {
    const submittedAnswerId = answers[question.id]
    const correctAnswer = question.answers.find((a) => a.isCorrect)
    const correctAnswerId = correctAnswer?.id ?? null

    const isCorrect =
      submittedAnswerId !== undefined &&
      submittedAnswerId === correctAnswerId

    if (isCorrect) correct++

    return {
      questionId: question.id,
      correct: isCorrect,
      correctAnswerId,
    }
  })

  const score = (correct / total) * 100

  // Persist progress — upsert so retakes overwrite the previous attempt
  try {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: dbUser.id,
          lessonId: quiz.lesson.id,
        },
      },
      update: {
        status: 'COMPLETED',
        score,
        completedAt: new Date(),
      },
      create: {
        userId: dbUser.id,
        lessonId: quiz.lesson.id,
        status: 'COMPLETED',
        score,
        completedAt: new Date(),
      },
    })
  } catch (err) {
    log.error('Failed to upsert lesson progress after quiz submission', err, {
      quizId,
      lessonId: quiz.lesson.id,
      userId: dbUser.id,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  log.info('Quiz submitted', {
    quizId,
    userId: dbUser.id,
    score,
    correct,
    total,
  })

  return NextResponse.json({ score, correct, total, results })
}
