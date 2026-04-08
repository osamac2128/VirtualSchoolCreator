import { StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import { Track } from '@prisma/client'
import prisma from '@/lib/prisma'
import { ParsedAtlasRow } from '../parsers/excel'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'

const llm = new ChatOpenAI({
  modelName: 'openai/gpt-4o-mini', // or 'anthropic/claude-3.5-sonnet'
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: 'https://openrouter.ai/api/v1',
  }
})

// Define Zod Schemas
const ThemeSchema = z.object({
  title: z.string(),
  durationWeeks: z.number(),
  aeroAlignment: z.array(z.string()),
})

const ThemesOutputSchema = z.object({
  themes: z.array(ThemeSchema),
})

const WeekSchema = z.object({
  weekNumber: z.number(),
  focus: z.string(),
  objectives: z.array(z.object({ text: z.string(), aeroCode: z.string() })),
  activities: z.array(z.string()),
  assessment: z.object({
    formative: z.string(),
    summative: z.string().optional()
  }).optional()
})

const ThemeWeeksSchema = z.object({
  weeks: z.array(WeekSchema)
})

interface CourseState {
  rawData: ParsedAtlasRow[]
  courseName: string
  gradeLevel: number
  track: string
  userId: string
  schoolId: string
  themes: z.infer<typeof ThemeSchema>[]
  weeksByTheme: Record<string, z.infer<typeof WeekSchema>[]>
  courseId?: string
}

async function extractThemesNode(state: CourseState): Promise<Partial<CourseState>> {
  const parser = StructuredOutputParser.fromZodSchema(ThemesOutputSchema)
  const prompt = PromptTemplate.fromTemplate(
    `You are an AERO-aligned curriculum expert. Group the following raw curriculum data into 4-8 logical Learning Themes.
    Raw Data: {rawData}
    Grade Level: {gradeLevel}
    Track: {track}

    {format_instructions}
    `
  )

  const chain = prompt.pipe(llm).pipe(parser)
  const response = await chain.invoke({
    rawData: JSON.stringify(state.rawData.map(row => ({
      unitName: row.unitName,
      duration: row.unitDuration,
      standards: row.aeroStandards,
    }))),
    gradeLevel: state.gradeLevel.toString(),
    track: state.track,
    format_instructions: parser.getFormatInstructions(),
  })

  return { themes: response.themes }
}

async function generateWeeksNode(state: CourseState): Promise<Partial<CourseState>> {
  const parser = StructuredOutputParser.fromZodSchema(ThemeWeeksSchema)

  // Pre-compute start week offsets for each theme
  const themeStartWeeks = state.themes.map((theme, idx) => {
    const startWeek = state.themes.slice(0, idx).reduce((acc, t) => acc + t.durationWeeks, 1)
    return { theme, startWeek }
  })

  const results = await Promise.all(
    themeStartWeeks.map(async ({ theme, startWeek }) => {
      const relevantRows = state.rawData.slice(0, 20)

      const prompt = PromptTemplate.fromTemplate(
        `Generate weekly plans for the theme "{themeTitle}" lasting {duration} weeks.
      Current global week number starts at: {startWeek}

      Source curriculum data for context:
      {sourceData}

      {format_instructions}
      `
      )

      const chain = prompt.pipe(llm).pipe(parser)
      const response = await chain.invoke({
        themeTitle: theme.title,
        duration: theme.durationWeeks.toString(),
        startWeek: startWeek.toString(),
        sourceData: JSON.stringify(relevantRows.slice(0, 20)),
        format_instructions: parser.getFormatInstructions(),
      })

      return {
        title: theme.title,
        weeks: response.weeks.map((w: z.infer<typeof WeekSchema>, idx: number) => ({
          ...w,
          weekNumber: startWeek + idx,
        })),
      }
    })
  )

  const weeksByTheme: Record<string, z.infer<typeof WeekSchema>[]> = {}
  for (const { title, weeks } of results) {
    weeksByTheme[title] = weeks
  }

  return { weeksByTheme }
}

async function persistCourseNode(state: CourseState): Promise<Partial<CourseState>> {
  // Collect all unique AERO alignment codes from all themes
  const allAeroStandards = [...new Set(state.themes.flatMap(t => t.aeroAlignment))]
  const totalWeeks = state.themes.reduce((acc, t) => acc + t.durationWeeks, 0)

  // Update existing stub or create new Course
  let course: { id: string }
  if (state.courseId) {
    course = await prisma.course.update({
      where: { id: state.courseId },
      data: {
        name: state.courseName,
        gradeLevel: state.gradeLevel,
        track: state.track as Track,
        totalWeeks,
        aeroStandards: allAeroStandards,
      },
    })
  } else {
    course = await prisma.course.create({
      data: {
        name: state.courseName,
        gradeLevel: state.gradeLevel,
        schoolId: state.schoolId,
        track: state.track as Track,
        totalWeeks,
        aeroStandards: allAeroStandards,
      },
    })
  }

  // Create Membership for the teacher who uploaded
  await prisma.membership.create({
    data: {
      userId: state.userId,
      courseId: course.id,
      role: 'TEACHER'
    }
  })

  for (const theme of state.themes) {
    const createdTheme = await prisma.learningTheme.create({
      data: {
        courseId: course.id,
        title: theme.title,
        durationWeeks: theme.durationWeeks,
        aeroAlignment: theme.aeroAlignment,
      }
    })

    const weeks = state.weeksByTheme[theme.title] || []
    for (const week of weeks) {
      await prisma.week.create({
        data: {
          themeId: createdTheme.id,
          courseId: course.id,
          weekNumber: week.weekNumber,
          focus: week.focus,
          objectives: week.objectives,
          activities: week.activities,
          assessment: week.assessment ? JSON.parse(JSON.stringify(week.assessment)) : null
        }
      })
    }
  }

  return { courseId: course.id }
}

function lastWriteWins<T>(state: T, update: T): T { return update ?? state }

export const graph = new StateGraph<CourseState>({
  channels: {
    rawData: { value: lastWriteWins<CourseState['rawData']>, default: () => [] },
    courseName: { value: lastWriteWins<string>, default: () => '' },
    gradeLevel: { value: lastWriteWins<number>, default: () => 0 },
    track: { value: lastWriteWins<string>, default: () => 'STANDARD' },
    userId: { value: lastWriteWins<string>, default: () => '' },
    schoolId: { value: lastWriteWins<string>, default: () => '' },
    themes: { value: lastWriteWins<CourseState['themes']>, default: () => [] },
    weeksByTheme: { value: lastWriteWins<CourseState['weeksByTheme']>, default: () => ({}) },
    courseId: { value: lastWriteWins<string | undefined>, default: () => undefined },
  }
})
  .addNode("extractThemes", extractThemesNode)
  .addNode("generateWeeks", generateWeeksNode)
  .addNode("persistCourse", persistCourseNode)
  .addEdge(START, "extractThemes")
  .addEdge("extractThemes", "generateWeeks")
  .addEdge("generateWeeks", "persistCourse")
  .addEdge("persistCourse", END)

export const courseApp = graph.compile()

export async function runCourseGenerationPipeline(rawData: ParsedAtlasRow[], userId: string, schoolId: string, courseName: string, gradeLevel: number, track: string, courseId?: string) {
  const result = await courseApp.invoke({
    rawData,
    userId,
    schoolId,
    courseName,
    gradeLevel,
    track,
    themes: [],
    weeksByTheme: {},
    courseId,
  })

  return result
}
