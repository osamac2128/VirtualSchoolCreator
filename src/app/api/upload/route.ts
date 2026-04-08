import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })
  }

  // Sanitize filename
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
  const path = `${dbUser.schoolId}/${Date.now()}-${sanitized}`

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  const adminClient = createSupabaseAdmin(supabaseUrl, serviceRoleKey)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await adminClient.storage
    .from('lesson-content')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[upload] Supabase storage error:', uploadError)
    return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
  }

  const { data: urlData } = adminClient.storage
    .from('lesson-content')
    .getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl })
}
