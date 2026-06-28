"use client"

import { useState } from "react"
import { VendorItemDoc, deleteVendorItem } from "@/lib/firestore"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit2, Loader2, Package } from "lucide-react"
import { EditItemDialog } from "./edit-item-dialog"

interface VendorItemsListProps {
  items: VendorItemDoc[]
  loading: boolean
  onItemsChange: () => void
}

export function VendorItemsList({ items, loading, onItemsChange }: VendorItemsListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<VendorItemDoc | null>(null)

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    setDeleting(itemId)
    try {
      if (itemId) {
        await deleteVendorItem(itemId)
        onItemsChange()
      }
    } catch (error) {
      console.error("Failed to delete item:", error)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">No items yet. Add your first item to get started!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{item.itemName}</h3>
                <p className="text-sm text-muted-foreground">{item.category || "Uncategorized"}</p>
              </div>
              {!item.isActive && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>

            <div className="mb-6 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per Unit</span>
                <span className="font-semibold text-emerald-600">₹{item.pricePerUnit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium text-foreground">{item.unit}</span>
              </div>
              {item.availableQuantity !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-foreground">{item.availableQuantity}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingItem(item)}
                className="flex-1 gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => item.id && handleDelete(item.id)}
                disabled={deleting === item.id}
                className="flex-1 gap-2"
              >
                {deleting === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onItemUpdated={() => {
            setEditingItem(null)
            onItemsChange()
          }}
        />
      )}
    </>
  )
}
