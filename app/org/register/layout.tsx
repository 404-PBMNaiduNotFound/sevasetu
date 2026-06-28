
import type { ReactNode } from "react"

// This layout overrides the parent app/org/layout.tsx for the register route only.
// It renders children with no sidebar or navbar — just a clean full-screen page.
export default function OrgRegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}