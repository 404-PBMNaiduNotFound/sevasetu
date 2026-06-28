"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getOrgOrders } from "@/lib/firestore"
import { TransactionsList } from "@/components/transactions/transactions-list"

export default function OrgTransactionsPage() {
  const { user, userDoc } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadTransactions = async () => {
      setLoading(true)
      try {
        const orders = await getOrgOrders(user.uid)
        setTransactions(orders)
      } catch (error) {
        console.error("Failed to load transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [user])

  if (!user || userDoc?.role !== "organization") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Organization role required.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 mb-8 md:p-8">
        <h1 className="text-white text-2xl font-bold md:text-3xl">Transactions</h1>
        <p className="mt-2 text-white/80 text-sm md:text-base">
          Track all vendor orders placed for your requirements
        </p>
      </div>

      <TransactionsList
        transactions={transactions}
        loading={loading}
        userRole="organization"
      />
    </div>
  )
}