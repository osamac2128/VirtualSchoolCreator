type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

const statusConfig: Record<ProgressStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: 'Not Started', className: 'bg-[var(--status-not-started)]/15 text-[var(--status-not-started)] ring-[var(--status-not-started)]/30' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-[var(--status-in-progress)]/15 text-[var(--status-in-progress)] ring-[var(--status-in-progress)]/30' },
  COMPLETED:   { label: 'Completed',   className: 'bg-[var(--status-completed)]/15 text-[var(--status-completed)] ring-[var(--status-completed)]/30' },
}

export function WeekStatusBadge({ status }: { status: ProgressStatus }) {
  const { label, className } = statusConfig[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {label}
    </span>
  )
}
