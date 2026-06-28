"use client"

import { useEffect, useState, useRef } from "react"
import { Star, User } from "lucide-react"
import { getRecentReviews, type ReviewDoc } from "@/lib/firestore"

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"
          }`}
        />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewDoc }) {
  return (
    <div className="flex-shrink-0 w-72 mx-3 rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        {review.photoURL ? (
          <img
            src={review.photoURL}
            alt={review.userName}
            className="h-10 w-10 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border">
            <User className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{review.userName}</p>
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
              review.userRole === "donor"
                ? "bg-blue-50 text-blue-700"
                : review.userRole === "vendor"
                ? "bg-orange-50 text-orange-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {review.userRole === "donor" ? "Donor" : review.userRole === "vendor" ? "Vendor" : "Organizer"}
          </span>
        </div>
      </div>

      {/* Rating */}
      <StarDisplay rating={review.rating} />

      {/* Comment */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{review.comment}</p>
    </div>
  )
}

export function ReviewCarousel() {
  const [reviews, setReviews] = useState<ReviewDoc[]>([])
  const [loading, setLoading] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getRecentReviews(10)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || reviews.length === 0) return null

  // Duplicate reviews for seamless infinite scroll
  const doubled = [...reviews, ...reviews]

  return (
    <section className="w-full py-16 overflow-hidden">
      <div className="container mx-auto px-4 mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">
          What People Are Saying
        </h2>
        <p className="mt-2 text-muted-foreground">
          Real feedback from our community of donors and organizers.
        </p>
      </div>

      {/* Marquee container */}
      <div className="relative w-full overflow-hidden">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />

        <div
          ref={trackRef}
          className="flex w-max animate-marquee"
          style={{
            // Each card is ~288px + 24px margin = ~312px; total track = cards * 312px
            animationDuration: `${reviews.length * 5}s`,
          }}
        >
          {doubled.map((review, i) => (
            <ReviewCard key={`${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
