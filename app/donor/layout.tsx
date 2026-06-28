"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { DonorShell } from "@/components/donor/donor-shell"

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The checkout and payment-history pages (Vendor/Payment modules) ship their
  // own full-bleed header + background, like org/register does for OrgLayout's
  // Sidebar. Nesting them inside DonorShell would double up the chrome.
  const isStandaloneRoute =
    pathname?.startsWith("/donor/checkout") || pathname?.startsWith("/donor/payments")

  if (isStandaloneRoute) {
    return <>{children}</>
  }

  return <DonorShell>{children}</DonorShell>
}
