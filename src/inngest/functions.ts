import { inngest } from './client'
import { runCourseGenerationPipeline } from '@/lib/ai/course-graph'
import prisma from '@/lib/prisma'

export const generateCourse = inngest.createFunction(
  { id: 'generate-course' },
  { event: 'course.generate' },
  async ({ event, step }) => {
    const { rawData, userId, schoolId, courseName, gradeLevel, track } = event.data

    const pipelineResult = await step.run('run-langgraph-pipeline', async () => {
      return runCourseGenerationPipeline(rawData, userId, schoolId, courseName, gradeLevel, track)
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
