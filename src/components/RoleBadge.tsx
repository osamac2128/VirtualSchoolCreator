type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  ADMIN:   { label: 'Admin',   className: 'bg-[var(--role-admin)]/15 text-[var(--role-admin)] ring-[var(--role-admin)]/30' },
  TEACHER: { label: 'Teacher', className: 'bg-[var(--role-teacher)]/15 text-[var(--role-teacher)] ring-[var(--role-teacher)]/30' },
  STUDENT: { label: 'Student', className: 'bg-[var(--role-student)]/15 text-[var(--role-student)] ring-[var(--role-student)]/30' },
  PARENT:  { label: 'Parent',  className: 'bg-[var(--role-parent)]/15 text-[var(--role-parent)] ring-[var(--role-parent)]/30' },
}

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = roleConfig[role]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {label}
    </span>
  )
}
