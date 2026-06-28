"use client"

import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { User, MapPin, Phone, Mail, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProfilePage() {
  const { userDoc } = useAuth()

  if (!userDoc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  const initials = (userDoc.name || "D")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-8 ">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white text-2xl font-bold text-foreground md:text-3xl">My Profile</h1>
          <p className="text-white hover:bg-blue-50 mt-2 text-sm text-muted-foreground">Your personal information.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 rounded-xl shrink-0">
          <Link href="/donor/settings">
            <Settings className="h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      </header>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Avatar card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="relative">
            {userDoc.photoURL ? (
              <img
                src={userDoc.photoURL}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                {initials}
              </span>
            )}
          </div>

          <div className="text-center">
            <p className="font-semibold text-foreground">{userDoc.name || "Donor"}</p>
            <p className="text-sm text-muted-foreground">{userDoc.email || ""}</p>
            {userDoc.city && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {userDoc.city}{userDoc.state ? `, ${userDoc.state}` : ""}
              </p>
            )}
            <p className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              Donor
            </p>
          </div>

          <Button asChild variant="outline" className="w-full gap-2 rounded-xl">
            <Link href="/donor/settings">
              <Settings className="h-4 w-4" />
              Edit in Settings
            </Link>
          </Button>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoRow label="Full Name" value={userDoc.name} icon={<User className="h-4 w-4" />} />
            <InfoRow label="Email Address" value={userDoc.email} icon={<Mail className="h-4 w-4" />} />
            <InfoRow label="Phone Number" value={userDoc.phone} icon={<Phone className="h-4 w-4" />} placeholder="Not set" />
            <InfoRow label="City" value={userDoc.city} icon={<MapPin className="h-4 w-4" />} placeholder="Not set" />
            {userDoc.state && (
              <InfoRow label="State" value={userDoc.state} icon={<MapPin className="h-4 w-4" />} />
            )}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">
              To update your name, phone, city, state or profile photo — go to{" "}
              <Link href="/donor/settings" className="font-medium text-primary hover:underline">
                Settings
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon,
  placeholder = "—",
}: {
  label: string
  value?: string
  icon: React.ReactNode
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className={`text-sm ${value ? "text-foreground" : "text-muted-foreground italic"}`}>
          {value || placeholder}
        </span>
      </div>
    </div>
  )
}
