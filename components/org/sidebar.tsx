"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logoutUser } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard, Building2, ClipboardList, HandHeart, Gift,
  Users, BarChart3, Settings, LifeBuoy, LogOut, Menu, X, Heart, Receipt, Truck,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/org/dashboard" },
  { label: "Profile", icon: Building2, href: "/org/profile" },
  { label: "Requirements", icon: ClipboardList, href: "/org/requirements" },
  { label: "Sponsorship Slots", icon: HandHeart, href: "/org/slots" },
  { label: "Donations", icon: Gift, href: "/org/donations" },
  { label: "Ready to Ship", icon: Truck, href: "/org/ready-to-ship" },
  { label: "Transactions", icon: Receipt, href: "/org/transactions" },
  { label: "Donors", icon: Users, href: "/org/donors" },
  { label: "Reports", icon: BarChart3, href: "/org/reports" },
  { label: "Settings", icon: Settings, href: "/org/settings" },
]

const bottomItems = [
  { label: "Help & Support", icon: LifeBuoy, href: "/org/help" },
  { label: "Logout", icon: LogOut, href: "#" },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const renderItem = (item: { label: string; icon: typeof Heart; href: string }) => {
    const isActive = pathname === item.href
    const Icon = item.icon

    if (item.label === "Logout") {
      return (
        <button
          key={item.label}
          onClick={handleLogout}
          className="mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span>{item.label}</span>
        </button>
      )
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onNavigate}
        className={`mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${
          isActive
            ? "bg-blue-50 font-medium text-blue-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1 py-4">{navItems.map(renderItem)}</nav>
      <div className="space-y-1 border-t border-gray-100 py-4">{bottomItems.map(renderItem)}</div>
    </div>
  )
}

function Logo() {
  return (
    <Link href="/org/dashboard" className="flex items-center gap-2 px-6 py-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700">
        <Heart className="h-5 w-5 text-white" fill="currentColor" />
      </span>
      <span className="text-lg font-bold text-blue-700">SevaSetu</span>
    </Link>
  )
}

function OrgTopBar() {
  const { userDoc } = useAuth()
  const router = useRouter()

  const orgName = userDoc?.name || "Organization"
  const initials = orgName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch {
      // ignore
    }
  }

  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-gray-100 bg-white px-6 py-3 lg:flex">
      <div />
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-gray-50 focus:outline-none">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                {initials}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{orgName}</p>
                <p className="text-xs text-gray-500">{userDoc?.email || ""}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/org/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/org/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
        <Link href="/org/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-700">
            <Heart className="h-4 w-4 text-white" fill="currentColor" />
          </span>
          <span className="text-base font-bold text-blue-700">SevaSetu</span>
        </Link>
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <Logo />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      {/* Desktop top header with org name */}
      <div className="lg:pl-64">
        <OrgTopBar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Logo />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}