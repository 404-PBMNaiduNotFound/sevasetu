"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logoutUser } from "@/lib/auth"
import {
  LayoutDashboard, User, HandHeart, FileText,
  Bell, TrendingUp, Settings, LifeBuoy, LogOut, Menu, X, Search, Heart, Building2, Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { label: "Dashboard", href: "/donor/dashboard", icon: LayoutDashboard },
  { label: "Organizations", href: "/donor/browse", icon: Building2 },
  { label: "My Profile", href: "/donor/profile", icon: User },
  { label: "My Donations", href: "/donor/donations", icon: HandHeart },
  { label: "My Requests", href: "/donor/requests", icon: FileText },
  { label: "Transactions", href: "/donor/transactions", icon: Receipt },
  { label: "Notifications", href: "/donor/notifications", icon: Bell },
  { label: "Impact", href: "/donor/impact", icon: TrendingUp },
  { label: "Settings", href: "/donor/settings", icon: Settings },
  { label: "Help & Support", href: "/donor/help", icon: LifeBuoy },
]

function Logo() {
  return (
    <Link href="/donor/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Heart className="h-5 w-5" fill="currentColor" />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-foreground">
        SevaSetu<span className="text-primary">.org</span>
      </span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
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
    <div className="flex h-full flex-col gap-6 p-5">
      <Logo />
      <NavLinks onNavigate={onNavigate} />
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        Logout
      </button>
    </div>
  )
}

export function DonorShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { userDoc } = useAuth()
  const router = useRouter()

  const initials = userDoc?.name
    ? userDoc.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "D"

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-sidebar shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (searchQuery.trim()) {
                router.push(`/donor/browse?q=${encodeURIComponent(searchQuery.trim())}`)
              }
            }}
            className="relative hidden flex-1 max-w-md md:block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organizations, causes..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <Link href="/donor/notifications" className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-secondary" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition-colors hover:bg-secondary focus:outline-none">
                  {userDoc?.photoURL ? (
                    <img src={userDoc.photoURL} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {initials}
                    </span>
                  )}
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold leading-tight text-foreground">{userDoc?.name || "Donor"}</p>
                    <p className="text-xs leading-tight text-muted-foreground">{userDoc?.email || ""}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/donor/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/donor/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

export { Button }
