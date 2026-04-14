'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/AppSidebar'
import { CourseViewerBar } from '@/components/CourseViewerBar'

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'

interface DashboardShellProps {
  role: UserRole
  userName: string
  schoolName: string
  children: React.ReactNode
}

// Routes where the sidebar is replaced by the slim course viewer bar
const VIEWER_ROUTE = /^\/courses\/[^/]+\/weeks\/\d+$/

export function DashboardShell({ role, userName, schoolName, children }: DashboardShellProps) {
  const pathname = usePathname()
  const isViewerRoute = VIEWER_ROUTE.test(pathname)

  if (isViewerRoute) {
    return (
      <div className="min-h-screen bg-background">
        <CourseViewerBar schoolName={schoolName} />
        <main className="pt-12 overflow-y-auto">
          <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role={role} userName={userName} schoolName={schoolName} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
