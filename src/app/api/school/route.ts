import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true, schoolId: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { name?: string; domain?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, domain } = body
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'School name must be at least 2 characters' }, { status: 400 })
  }

  const updated = await prisma.school.update({
    where: { id: dbUser.schoolId },
    data: {
      name: name.trim().slice(0, 200),
      ...(domain !== undefined ? { domain: domain.trim() || null } : {}),
    },
    select: { id: true, name: true, domain: true },
  })

  return NextResponse.json(updated)
}
