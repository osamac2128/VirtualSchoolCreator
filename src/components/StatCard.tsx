import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  variant?: 'default' | 'primary' | 'accent'
}

export function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  const iconBg =
    variant === 'accent'
      ? 'bg-[var(--accent)]/15 text-[var(--accent-foreground)]'
      : variant === 'primary'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`flex-shrink-0 rounded-lg p-2.5 ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
