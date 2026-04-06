import { inngest } from './client'
import { runCourseGenerationPipeline } from '@/lib/ai/course-graph'
import prisma from '@/lib/prisma'

export const generateCourse = inngest.createFunction(
  { id: 'generate-course' },
  { event: 'course.generate' },
  async ({ event, step }) => {
    const { rawData, userId, schoolId, courseName, gradeLevel, track } = event.data

    await step.run('initialize-pipeline', async () => {
      console.log(`Starting AI pipeline for course: ${courseName} by user ${userId} on track ${track}`)
      return { status: 'started' }
    })

    const pipelineResult = await step.run('run-langgraph-pipeline', async () => {
      return runCourseGenerationPipeline(rawData, userId, schoolId, courseName, gradeLevel, track)
    })

    await step.run('notify-user', async () => {
      console.log(`Finished generation for ${courseName}`)
    })

    await step.run('audit-log', async () => {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'COURSE_GENERATED',
          details: `Generated course "${courseName}" for grade ${gradeLevel} on ${track} track.`
        }
      })
    })

    return { result: pipelineResult }
  }
)
