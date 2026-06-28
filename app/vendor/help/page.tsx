"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, Star, Send, CheckCircle2 } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { addReview } from "@/lib/firestore"

async function fetchContactInfo(): Promise<{ email: string; phone: string }> {
  try {
    const snap = await getDoc(doc(db, "settings", "contact"))
    if (snap.exists()) return { email: snap.data().email ?? "", phone: snap.data().phone ?? "" }
  } catch {}
  return { email: "", phone: "" }
}

export default function HelpPage() {
  const { user, userDoc } = useAuth()

  const [contact, setContact] = useState({ email: "", phone: "" })
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContactInfo().then(setContact)
  }, [])

  const handleSubmit = async () => {
    if (!user || !userDoc) return setError("You must be logged in to submit a review.")
    if (rating === 0) return setError("Please select a rating.")
    if (!comment.trim()) return setError("Please enter a comment.")

    setSubmitting(true)
    setError(null)
    try {
      await addReview({
        userId: user.uid,
        userName: userDoc.name || user.email || "Anonymous",
        userRole: "vendor",
        photoURL: userDoc.photoURL ?? undefined,
        rating,
        comment: comment.trim(),
      })
      setSubmitted(true)
      setComment("")
      setRating(0)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to submit review. Please try again.";
      setError(errMsg);
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8 space-y-10">
      {/* Help & Support Header */}
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <h1 className="text-2xl text-white font-bold text-foreground">Help &amp; Support</h1>
        <p className="mt-2 text-white text-muted-foreground">
          Need help? Reach out to our admin team directly.
        </p>
      </div>

      {/* Contact Info from Admin */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Contact Admin</h2>
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0" />
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <a
            href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors"
          >
            <Phone className="h-4 w-4 shrink-0" />
            {contact.phone}
          </a>
        )}
        {!contact.email && !contact.phone && (
          <p className="text-sm text-muted-foreground">Contact details not configured by admin yet.</p>
        )}
      </div>

      {/* Review / Feedback Section */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Share Your Feedback</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Help us improve! Rate the app and leave a comment about your experience, suggestions, or improvements.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-semibold text-foreground">Thank you for your feedback!</p>
            <p className="text-sm text-muted-foreground">Your review has been submitted successfully.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-sm text-primary underline underline-offset-4"
            >
              Submit another review
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Star Rating */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-none text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Your Review &amp; Suggestions
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience, what you liked, improvements you'd like to see…"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
