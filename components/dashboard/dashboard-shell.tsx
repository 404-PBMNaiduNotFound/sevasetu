"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logoutUser } from "@/lib/auth"
import { Heart, Bell, Menu, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type DashboardShellProps = {
  nav: NavItem[]
  user: { name: string; initials: string; role: string }
  notifications?: number
  children: ReactNode
}

function SidebarContent({
  nav,
  pathname,
  onNavigate,
}: {
  nav: NavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className="flex items-center gap-2.5 border-b border-gray-100 px-6 py-5"
        onClick={onNavigate}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Heart className="h-5 w-5" fill="currentColor" />
        </span>
        <span className="text-lg font-extrabold tracking-tight text-foreground">SevaSetu</span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto py-4">
        {nav.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          if (item.label === "Logout") {
            return (
              <button
                key={item.href}
                onClick={handleLogout}
                className={cn(
                  "mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-red-50 hover:text-red-600",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "mx-2 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-primary"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function DashboardShell({ nav, user, notifications = 0, children }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-100 bg-white lg:block">
        <SidebarContent nav={nav} pathname={pathname} />
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <SidebarContent nav={nav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground"
              aria-label={`Notifications${notifications ? `, ${notifications} unread` : ""}`}
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {notifications}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-primary">
                {user.initials}
              </span>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
