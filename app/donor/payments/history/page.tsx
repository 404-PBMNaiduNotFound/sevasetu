'use client'

import Link from 'next/link'
import { ArrowLeft, History } from 'lucide-react'
import { PaymentHistory } from '@/components/payment/PaymentHistory'
import { useAuth } from '@/lib/auth-context'

export default function PaymentHistoryPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/donor/dashboard"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1">
            <History size={16} className="text-blue-700" />
            <span className="text-xs font-semibold text-blue-700">
              PAYMENT HISTORY
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payment History
          </h1>
          <p className="mt-2 text-gray-600">
            View all your past donations and transactions
          </p>
        </div>

        <PaymentHistory donorId={user?.uid ?? ''} />

        <div className="mt-8">
          <Link
            href="/donor/browse"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-2.5 font-semibold text-white transition hover:bg-blue-600"
          >
            Make Another Donation
          </Link>
        </div>
      </main>
    </div>
  )
}
