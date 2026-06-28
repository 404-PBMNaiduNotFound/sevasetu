import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = request.cookies.get("user_role")?.value ?? ""

  // ── Org register page: always allow through regardless of role ──
  // The page itself handles all cases:
  //   - logged-in user → shows "contact admin" popup
  //   - no invite token → shows invalid invite screen
  //   - valid invite + not logged in → shows the form
  if (pathname === "/org/register") {
    return NextResponse.next()
  }

  // ── Admin routes ───────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  // ── Org routes ─────────────────────────────────────────────
  if (pathname.startsWith("/org")) {
    if (role !== "organization") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  // ── Donor routes ───────────────────────────────────────────
  if (pathname.startsWith("/donor")) {
    if (role !== "donor") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  // ── Vendor routes ──────────────────────────────────────────
  if (pathname.startsWith("/vendor")) {
    if (pathname === "/vendor/register") {
      return NextResponse.next()
    }
    if (role !== "vendor") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/org/:path*",
    "/donor/:path*",
    "/vendor/:path*",
  ],
}