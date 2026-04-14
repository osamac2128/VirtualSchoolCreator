'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, GraduationCap } from 'lucide-react'

export function CourseViewerBar({ schoolName }: { schoolName: string }) {
  const pathname = usePathname()
  // /courses/[id]/weeks/[n] → /courses/[id]
  const backHref = pathname.replace(/\/weeks\/\d+$/, '')

  return (
    <header className="fixed top-0 inset-x-0 z-10 h-12 flex items-center gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:px-6">
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Course
      </Link>

      <div className="hidden sm:flex items-center gap-2 ml-auto">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent)]/20">
          <GraduationCap className="h-3.5 w-3.5 text-[var(--accent)]" />
        </div>
        <span className="text-xs text-muted-foreground/70 tracking-wide">{schoolName}</span>
      </div>
    </header>
  )
}
