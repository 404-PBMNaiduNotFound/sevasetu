"use client"
import { Heart, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const linkGroups = [
  {
    title: "Platform",
    links: ["How it works", "Browse organizations", "Start a campaign", "Pricing"],
  },
  {
    title: "Organizations",
    links: ["Register your NGO", "Verification", "Resources", "Success stories"],
  },
  {
    title: "Company",
    links: ["About us", "Careers", "Press", "Contact"],
  },
]

const socials = [Facebook, Twitter, Instagram, Linkedin]

export function Footer() {
  const [contact, setContact] = useState({ email: "", phone: "" })

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "contact"))
        if (snap.exists()) setContact({ email: snap.data().email ?? "", phone: snap.data().phone ?? "" })
      } catch {}
    }
    fetchContactInfo()
  }, [])

  return (
    <footer id="contact" className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#home" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Heart className="h-5 w-5" fill="currentColor" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-lg font-extrabold tracking-tight text-foreground">SevaSetu</span>
                <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                  Smart Donation &amp; Requirement Coordination Platform
                </span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A trusted platform connecting generous donors with verified organizations creating
              lasting change around the world.
            </p>
            <ul className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {contact.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href={`mailto:${contact.email}`} className="text-primary underline">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <a href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`} className="text-primary underline">
                    {contact.phone}
                  </a>
                </li>
              )}
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Vishakaptnam Gajuwaka
                </li>
            </ul>
          </div>

          {/* Link groups */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SevaSetu. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socials.map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Social media"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
