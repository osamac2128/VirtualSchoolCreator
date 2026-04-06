'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
  TrendingUp,
  Heart,
} from 'lucide-react'
import { RoleBadge } from '@/components/RoleBadge'

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard',   href: '/dashboard/admin',   icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'All Courses', href: '/dashboard/admin',   icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Users',       href: '/dashboard/admin',   icon: <Users className="h-4 w-4" /> },
    { label: 'Settings',    href: '/dashboard/admin',   icon: <Settings className="h-4 w-4" /> },
  ],
  TEACHER: [
    { label: 'My Courses', href: '/dashboard/teacher', icon: <BookOpen className="h-4 w-4" /> },
  ],
  STUDENT: [
    { label: 'My Learning', href: '/dashboard/student', icon: <TrendingUp className="h-4 w-4" /> },
  ],
  PARENT: [
    { label: "Children's Progress", href: '/dashboard/parent', icon: <Heart className="h-4 w-4" /> },
  ],
}

interface AppSidebarProps {
  role: UserRole
  userName: string
  schoolName: string
}

export function AppSidebar({ role, userName, schoolName }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = navByRole[role] ?? []

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/20">
          <GraduationCap className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{schoolName}</p>
          <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40">Virtual School</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
          Navigation
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
            <RoleBadge role={role} />
          </div>
          <button
            onClick={handleSignOut}
            className="flex-shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
            title="Sign out"
          >
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-sidebar-border">
        {sidebarContent}
      </aside>

      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-40 w-64 flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
