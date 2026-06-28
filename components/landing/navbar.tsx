"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, Menu, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Organizations", href: "#organizations" },
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" fill="currentColor" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-foreground">SevaSetu</span>
            <span className="hidden text-[11px] font-medium leading-tight text-muted-foreground lg:block">
              Smart Donation &amp; Requirement Coordination Platform
            </span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            asChild
            variant="ghost"
            className="text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="gap-1.5 rounded-xl bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/register">
              Get Started
              <ChevronDown className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-accent md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button asChild variant="outline" className="rounded-xl border-2 font-medium">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                className="rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
