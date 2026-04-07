import { NextResponse } from 'next/server'
import { parseAtlasExcel } from '@/lib/parsers/excel'
import { parseOneRoster } from '@/lib/parsers/csv'
import { inngest } from '@/inngest/client'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter'
import { sanitizeText, isNumericString, isValidTrack } from '@/lib/security/sanitize'

/** Maximum allowed upload size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.zip']

function hasAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext))
}

export async function POST(req: Request) {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = getClientIp(req)
  const rateLimit = checkRateLimit(`ingest:${ip}`, { limit: 20, windowMs: 60_000 })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before uploading again.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    )
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Derive schoolId from authenticated user's Prisma record ───────────────
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { schoolId: true, id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    const { schoolId } = dbUser

    // ── Parse + validate form data ────────────────────────────────────────────
    const form = await req.formData()
    const file = form.get('file') as File | null
    const rawCourseName = form.get('courseName') as string | null
    const rawGradeLevel = form.get('gradeLevel') as string | null
    const rawTrack = (form.get('track') as string | null) ?? 'STANDARD'

    if (!file || !rawCourseName || !rawGradeLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Sanitize inputs ────────────────────────────────────────────────────────
    const courseName = sanitizeText(rawCourseName, 200)
    const gradeLevelStr = sanitizeText(rawGradeLevel, 10)
    const track = sanitizeText(rawTrack, 20)

    if (!courseName) {
      return NextResponse.json({ error: 'Invalid course name' }, { status: 400 })
    }

    if (!isNumericString(gradeLevelStr)) {
      return NextResponse.json({ error: 'gradeLevel must be a number' }, { status: 400 })
    }

    if (!isValidTrack(track)) {
      return NextResponse.json({ error: 'Invalid track value' }, { status: 400 })
    }

    // ── File validation ────────────────────────────────────────────────────────
    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 10 MB' },
        { status: 413 }
      )
    }

    // ── Parse file ─────────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    let rawData

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      rawData = await parseAtlasExcel(buffer)
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.zip')) {
      rawData = await parseOneRoster(buffer)
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 })
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'No valid data extracted from file' }, { status: 400 })
    }

    // ── Queue background job via Inngest ───────────────────────────────────────
    const { ids } = await inngest.send({
      name: 'course.generate',
      data: {
        rawData,
        userId: dbUser.id,
        schoolId,
        courseName,
        gradeLevel: parseInt(gradeLevelStr, 10),
        track,
      },
    })

    return NextResponse.json({ jobId: ids[0] ?? null, message: 'Course generation queued successfully' })
  } catch (error: unknown) {
    console.error('Ingest error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
