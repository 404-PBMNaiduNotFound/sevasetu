"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getVendorItems, VendorItemDoc } from "@/lib/firestore"
import { VendorItemsList } from "@/components/vendor/vendor-items-list"
import { AddItemDialog } from "@/components/vendor/add-item-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function VendorItemsPage() {
  const { user, userDoc } = useAuth()
  const [items, setItems] = useState<VendorItemDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadItems = async () => {
      setLoading(true)
      try {
        const vendorItems = await getVendorItems(user.uid)
        setItems(vendorItems)
      } catch (error) {
        console.error("Failed to load vendor items:", error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">My Items</h1>
            <p className="mt-2 text-sm text-white/80">Manage your product catalog</p>
          </div>
          <Button onClick={() => setOpenDialog(true)} variant="secondary" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <AddItemDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onItemAdded={() => {
          const loadItems = async () => {
            if (user) {
              const vendorItems = await getVendorItems(user.uid)
              setItems(vendorItems)
            }
          }
          loadItems()
        }}
      />

      <VendorItemsList items={items} loading={loading} onItemsChange={() => {
        const loadItems = async () => {
          if (user) {
            const vendorItems = await getVendorItems(user.uid)
            setItems(vendorItems)
          }
        }
        loadItems()
      }} />
    </div>
  )
}
