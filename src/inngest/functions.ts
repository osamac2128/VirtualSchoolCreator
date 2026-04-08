import { inngest } from './client'
import { runCourseGenerationPipeline } from '@/lib/ai/course-graph'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export const generateCourse = inngest.createFunction(
  { id: 'generate-course' },
  { event: 'course.generate' },
  async ({ event, step }) => {
    const { rawData, userId, schoolId, courseName, gradeLevel, track, courseId } = event.data

    await step.run('set-processing', async () => {
      await prisma.course.update({
        where: { id: courseId },
        data: { status: 'PROCESSING' },
      })
    })

    let pipelineResult: unknown
    try {
      pipelineResult = await step.run('run-langgraph-pipeline', async () => {
        return runCourseGenerationPipeline(rawData, userId, schoolId, courseName, gradeLevel, track, courseId)
      })

      await step.run('set-complete', async () => {
        await prisma.course.update({
          where: { id: courseId },
          data: { status: 'COMPLETE' },
        })
      })
    } catch (err: unknown) {
      await step.run('set-failed', async () => {
        await prisma.course.update({
          where: { id: courseId },
          data: {
            status: 'FAILED',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
          },
        })
      })
      throw err
    }

    await step.run('audit-log', async () => {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'COURSE_GENERATED',
          details: `Generated course "${courseName}" for grade ${gradeLevel} on ${track} track.`,
        },
      })
    })

    await step.run('notify-complete', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Your course is ready!',
          html: `<p>Hi ${user.name}, your course &quot;${courseName}&quot; has been generated and is ready to use.</p>`,
        })
      }
    })

    return { result: pipelineResult }
  }
)
