"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getVendorOrders } from "@/lib/firestore"
import { TransactionsList } from "@/components/transactions/transactions-list"

export default function VendorTransactionsPage() {
  const { user, userDoc } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadTransactions = async () => {
      setLoading(true)
      try {
        const orders = await getVendorOrders(user.uid)
        setTransactions(orders)
      } catch (error) {
        console.error("Failed to load transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [user])

  if (!user || userDoc?.role !== "vendor") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Access denied. Vendor role required.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-white md:text-3xl">My Orders</h1>
        <p className="mt-2 text-sm text-white/80">
          Manage orders from donors and organizations
        </p>
      </div>

      <TransactionsList
        transactions={transactions}
        loading={loading}
        userRole="vendor"
      />
    </div>
  )
}
