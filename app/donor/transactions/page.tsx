"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { subscribeToDonorOrders } from "@/lib/firestore"
import { TransactionsList } from "@/components/transactions/transactions-list"

export default function DonorTransactionsPage() {
  const { user, userDoc } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    setLoading(true)
    const unsubscribe = subscribeToDonorOrders(user.uid, (orders) => {
      setTransactions(orders)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  if (!user || userDoc?.role !== "donor") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Donor role required.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 mb-8 md:p-8">
        <h1 className="text-white text-2xl font-bold md:text-3xl">My Transactions</h1>
        <p className="mt-2 text-white/80 text-sm md:text-base">
          View all your vendor purchases and donation payments
        </p>
      </div>

      <TransactionsList
        transactions={transactions}
        loading={loading}
        userRole="donor"
      />
    </div>
  )
}