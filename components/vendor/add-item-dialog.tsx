"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { createVendorItem } from "@/lib/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemAdded: () => void
}

const UNITS = ["kg", "L", "pieces", "boxes", "bundles", "meters", "hours"]
const CATEGORIES = ["Groceries", "Clothing", "Books", "Medical", "Tools", "Services", "Other"]

export function AddItemDialog({ open, onOpenChange, onItemAdded }: AddItemDialogProps) {
  const { user, userDoc } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    itemName: "",
    unit: "kg",
    pricePerUnit: "",
    category: "Other",
    availableQuantity: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !userDoc) return

    setLoading(true)
    try {
      const itemData: any = {
        vendorId: user.uid,
        vendorName: userDoc.name,
        itemName: formData.itemName,
        unit: formData.unit,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        category: formData.category,
        isActive: true,
      }

      if (formData.availableQuantity) {
        itemData.availableQuantity = parseFloat(formData.availableQuantity)
      }

      await createVendorItem(itemData)

      setFormData({
        itemName: "",
        unit: "kg",
        pricePerUnit: "",
        category: "Other",
        availableQuantity: "",
      })
      onOpenChange(false)
      onItemAdded()
    } catch (error) {
      console.error("Failed to create item:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a product to your catalog that donors and organizations can purchase
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="e.g., Rice, Vegetables, Books"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="pricePerUnit">Price per Unit (₹)</Label>
              <Input
                id="pricePerUnit"
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="availableQuantity">Available Quantity (Optional)</Label>
              <Input
                id="availableQuantity"
                type="number"
                step="0.01"
                value={formData.availableQuantity}
                onChange={(e) => setFormData({ ...formData, availableQuantity: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
