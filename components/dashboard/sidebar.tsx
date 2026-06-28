"use client"

import {
  LayoutDashboard,
  HeartHandshake,
  Users,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Settings,
  HelpCircle,
  Heart,
} from "lucide-react"

const mainNav = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "campaigns", icon: HeartHandshake, label: "Campaigns" },
  { id: "donors", icon: Users, label: "Donors" },
  { id: "calendar", icon: CalendarDays, label: "Sponsorships" },
  { id: "requirements", icon: ClipboardList, label: "Requirements" },
  { id: "reports", icon: BarChart3, label: "Reports" },
]

const bottomNav = [
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "help", icon: HelpCircle, label: "Help & Support" },
]

export function Sidebar({ active = "dashboard" }: { active?: string }) {
  return (
    <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-100 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
          <Heart size={18} className="text-white" fill="currentColor" />
        </div>
          <span className="text-blue-700 font-bold text-lg tracking-tight">SevaSetu</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-6 space-y-1">
        <p className="px-6 mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Menu</p>
        {mainNav.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active
          return (
            <a
              key={item.id}
              href="#"
              className={`flex items-center gap-3 mx-2 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-50 font-medium"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="py-4 border-t border-gray-100 space-y-1">
        {bottomNav.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.id}
              href="#"
              className="flex items-center gap-3 mx-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Icon size={18} />
              {item.label}
            </a>
          )
        })}
      </div>

      {/* User card */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            MR
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Maria Reyes</p>
            <p className="text-xs text-gray-400 truncate">Program Director</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
