"use client"

import { useEffect, useState } from "react"

type Phase = "visible" | "fading" | "gone"

export function SplashScreen() {
  const [phase, setPhase]       = useState<Phase>("visible")
  const [showLogo, setShowLogo] = useState(false)
  const [showText, setShowText] = useState(false)
  const [showBar, setShowBar]   = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowLogo(true), 50),
      setTimeout(() => setShowBar(true),  350),
      setTimeout(() => setShowText(true), 750),
      setTimeout(() => setPhase("fading"), 1800),
      setTimeout(() => setPhase("gone"),   2450),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  if (phase === "gone") return null

  const wrapStyle: React.CSSProperties = {
    position:        "fixed",
    inset:           0,
    zIndex:          9999,
    display:         "flex",
    flexDirection:   "column",
    alignItems:      "center",
    justifyContent:  "center",
    background:      "#F8FAFC",
    opacity:         phase === "fading" ? 0 : 1,
    transition:      "opacity 0.65s ease",
    pointerEvents:   phase === "fading" ? "none" : "auto",
  }

  const logoStyle: React.CSSProperties = {
    width:      180,
    height:     180,
    opacity:    showLogo ? 1 : 0,
    transform:  showLogo ? "scale(1) rotate(0deg)" : "scale(0.4) rotate(-12deg)",
    transition: showLogo
      ? "transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease"
      : "none",
  }

  const imgStyle: React.CSSProperties = {
    borderRadius: "50%",
    boxShadow:    "0 8px 40px rgba(29,78,216,0.18)",
    width:        180,
    height:       180,
    display:      "block",
  }

  const textStyle: React.CSSProperties = {
    marginTop:      20,
    fontSize:       13,
    fontWeight:     600,
    letterSpacing:  "0.12em",
    textTransform:  "uppercase",
    color:          "#64748b",
    opacity:        showText ? 1 : 0,
    transform:      showText ? "translateY(0px)" : "translateY(14px)",
    transition:     "opacity 0.5s ease, transform 0.5s ease",
  }

  const trackStyle: React.CSSProperties = {
    marginTop:    28,
    width:        160,
    height:       3,
    borderRadius: 99,
    background:   "#e2e8f0",
    overflow:     "hidden",
  }

  const fillStyle: React.CSSProperties = {
    height:     "100%",
    borderRadius: 99,
    background: "linear-gradient(90deg, #1D4ED8, #16A34A)",
    width:      showBar ? "100%" : "0%",
    transition: showBar ? "width 1.5s cubic-bezier(0.4,0,0.2,1)" : "none",
  }

  return (
    <div aria-hidden="true" style={wrapStyle}>
      <div style={logoStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-512.png" alt="SevaSetu" style={imgStyle} />
      </div>
      <p style={textStyle}>Connecting Compassion, Creating Change</p>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
    </div>
  )
}