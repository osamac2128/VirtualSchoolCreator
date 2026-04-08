import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { buttonVariants } from '@/components/ui/button-variants'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ALL_ACTION_TYPES = [
  'COURSE_GENERATED',
  'USER_INVITED',
  'USER_UPDATED',
  'ENROLLMENT_ADDED',
  'ENROLLMENT_REMOVED',
  'PROGRESS_RESET',
  'GAP_ANALYSIS_RUN',
  'PARENT_LINKED',
  'PARENT_UNLINKED',
  'COURSE_DELETED',
  'SETTINGS_UPDATED',
] as const

interface PageProps {
  searchParams: Promise<{ page?: string; action?: string }>
}

function buildUrl(base: string, params: Record<string, string | undefined>) {
  const url = new URL(base, 'http://x')
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v)
    else url.searchParams.delete(k)
  }
  return url.pathname + (url.search !== '?' ? url.search : '')
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const { page: pageParam, action: actionParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { schoolId: true, role: true },
  })
  if (!dbUser) redirect('/login')
  if (dbUser.role !== 'ADMIN') redirect('/dashboard')

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const pageSize = 50
  const action = actionParam ?? undefined

  const whereClause = {
    user: { schoolId: dbUser.schoolId },
    ...(action ? { action } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.auditLog.count({ where: whereClause }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const basePath = '/dashboard/admin/audit-log'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="All admin actions across your school"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard/admin' }]}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildUrl(basePath, { page: '1', action: undefined })}
          className={buttonVariants({
            variant: !action ? 'default' : 'outline',
            size: 'sm',
          })}
        >
          All
        </Link>
        {ALL_ACTION_TYPES.map((type) => (
          <Link
            key={type}
            href={buildUrl(basePath, { page: '1', action: type })}
            className={buttonVariants({
              variant: action === type ? 'default' : 'outline',
              size: 'sm',
            })}
          >
            {type.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                Date / Time
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                Action
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                User
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className={
                    idx % 2 === 0
                      ? 'border-b border-border/50'
                      : 'border-b border-border/50 bg-muted/20'
                  }
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-foreground">{log.user.name}</p>
                    <p className="text-xs text-muted-foreground">{log.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-sm truncate">
                    {log.details ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'No entries'
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={buildUrl(basePath, { page: String(page - 1), action })}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Link>
          ) : (
            <span className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' opacity-40 pointer-events-none'}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </span>
          )}

          <span className="text-sm font-medium text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildUrl(basePath, { page: String(page + 1), action })}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' opacity-40 pointer-events-none'}>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
