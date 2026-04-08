import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { apiLogger } from '@/lib/api-logger'

type Params = Promise<{ quizId: string }>

// ---------------------------------------------------------------------------
// Shared auth helpers
// ---------------------------------------------------------------------------

async function getAuthedTeacherOrAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return null
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') return null
  return dbUser
}

/** Find a quiz by id, scoped to the user's school via the lesson→week→theme→course chain. */
async function getQuizInSchool(quizId: string, schoolId: string) {
  return prisma.quiz.findFirst({
    where: {
      id: quizId,
      lesson: {
        week: {
          theme: {
            course: { schoolId },
          },
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface AnswerInput {
  id?: string
  text: string
  isCorrect: boolean
}

interface QuestionInput {
  id?: string
  text: string
  type?: string
  order: number
  answers: AnswerInput[]
}

// ---------------------------------------------------------------------------
// GET — fetch quiz with full question+answer tree
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { quizId } = await params
  const log = apiLogger('GET /api/quizzes/[quizId]', { quizId })

  const dbUser = await getAuthedTeacherOrAdmin()
  if (!dbUser) {
    log.warn('Unauthenticated or insufficient role')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      questions: {
        orderBy: { order: 'asc' },
        include: { answers: true },
      },
    },
  })

  if (!quiz) {
    log.warn('Quiz not found or school mismatch', { quizId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  log.info('Quiz fetched', { quizId })
  return NextResponse.json(quiz)
}

// ---------------------------------------------------------------------------
// PATCH — update quiz title + questions + answers (full replace of children)
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Params },
) {
  const { quizId } = await params
  const log = apiLogger('PATCH /api/quizzes/[quizId]', { quizId })

  const dbUser = await getAuthedTeacherOrAdmin()
  if (!dbUser) {
    log.warn('Unauthenticated or insufficient role')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quiz = await getQuizInSchool(quizId, dbUser.schoolId)
  if (!quiz) {
    log.warn('Quiz not found or school mismatch', { quizId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  let body: { title?: string; questions?: QuestionInput[] }
  try {
    body = await req.json()
  } catch {
    log.warn('Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, questions } = body

  // Validate questions if provided
  const validQuestionTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE']
  if (questions !== undefined) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'questions must be a non-empty array' },
        { status: 400 },
      )
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
        return NextResponse.json(
          { error: `questions[${i}].text is required` },
          { status: 400 },
        )
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
  }

  // Run all mutations in a transaction
  let updated
  try {
    updated = await prisma.$transaction(async (tx) => {
      // 1. Update quiz title if provided
      if (title !== undefined && title.trim().length > 0) {
        await tx.quiz.update({
          where: { id: quizId },
          data: { title: title.trim() },
        })
      }

      if (questions !== undefined) {
        // 2. Load existing question ids for this quiz
        const existingQuestions = await tx.question.findMany({
          where: { quizId },
          select: { id: true },
        })
        const existingQIds = new Set(existingQuestions.map((q) => q.id))

        // Submitted question ids that already existed in DB
        const submittedQIds = new Set(
          questions.filter((q) => q.id).map((q) => q.id as string),
        )

        // 3. Delete questions not present in the submitted list
        const qIdsToDelete = [...existingQIds].filter((id) => !submittedQIds.has(id))
        if (qIdsToDelete.length > 0) {
          await tx.question.deleteMany({
            where: { id: { in: qIdsToDelete } },
          })
        }

        // 4. Upsert each question and its answers
        for (const q of questions) {
          const questionType = (q.type ?? 'MULTIPLE_CHOICE') as 'MULTIPLE_CHOICE' | 'TRUE_FALSE'

          let questionId: string

          if (q.id && existingQIds.has(q.id)) {
            // Update existing question
            await tx.question.update({
              where: { id: q.id },
              data: {
                text: q.text.trim(),
                type: questionType,
                order: q.order,
              },
            })
            questionId = q.id
          } else {
            // Create new question
            const created = await tx.question.create({
              data: {
                quizId,
                text: q.text.trim(),
                type: questionType,
                order: q.order,
              },
            })
            questionId = created.id
          }

          // 5. Load existing answer ids for this question
          const existingAnswers = await tx.answer.findMany({
            where: { questionId },
            select: { id: true },
          })
          const existingAIds = new Set(existingAnswers.map((a) => a.id))

          const submittedAIds = new Set(
            q.answers.filter((a) => a.id).map((a) => a.id as string),
          )

          // 6. Delete answers not in submitted list
          const aIdsToDelete = [...existingAIds].filter((id) => !submittedAIds.has(id))
          if (aIdsToDelete.length > 0) {
            await tx.answer.deleteMany({
              where: { id: { in: aIdsToDelete } },
            })
          }

          // 7. Upsert each answer
          for (const a of q.answers) {
            if (a.id && existingAIds.has(a.id)) {
              await tx.answer.update({
                where: { id: a.id },
                data: { text: a.text, isCorrect: a.isCorrect },
              })
            } else {
              await tx.answer.create({
                data: { questionId, text: a.text, isCorrect: a.isCorrect },
              })
            }
          }
        }
      }

      // Return the full updated tree
      return tx.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { answers: true },
          },
        },
      })
    })
  } catch (err) {
    log.error('Failed to update quiz in transaction', err, { quizId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  log.info('Quiz updated', { quizId })
  return NextResponse.json(updated)
}

// ---------------------------------------------------------------------------
// DELETE — delete entire quiz (cascades to questions + answers via schema)
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { quizId } = await params
  const log = apiLogger('DELETE /api/quizzes/[quizId]', { quizId })

  const dbUser = await getAuthedTeacherOrAdmin()
  if (!dbUser) {
    log.warn('Unauthenticated or insufficient role')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quiz = await getQuizInSchool(quizId, dbUser.schoolId)
  if (!quiz) {
    log.warn('Quiz not found or school mismatch', { quizId, schoolId: dbUser.schoolId })
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  await prisma.quiz.delete({ where: { id: quizId } })

  log.info('Quiz deleted', { quizId })
  return NextResponse.json({ ok: true })
}
