"use client"

import { useState } from "react"
import { VendorItemDoc, updateVendorItem } from "@/lib/firestore"
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

interface EditItemDialogProps {
  item: VendorItemDoc
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemUpdated: () => void
}

const UNITS = ["kg", "L", "pieces", "boxes", "bundles", "meters", "hours"]
const CATEGORIES = ["Groceries", "Clothing", "Books", "Medical", "Tools", "Services", "Other"]

export function EditItemDialog({
  item,
  open,
  onOpenChange,
  onItemUpdated,
}: EditItemDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    itemName: item.itemName,
    unit: item.unit,
    pricePerUnit: item.pricePerUnit.toString(),
    category: item.category || "Other",
    availableQuantity: item.availableQuantity?.toString() || "",
    isActive: item.isActive,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item.id) return

    setLoading(true)
    try {
      const updateData: any = {
        itemName: formData.itemName,
        unit: formData.unit,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        category: formData.category,
        isActive: formData.isActive,
      }

      if (formData.availableQuantity) {
        updateData.availableQuantity = parseFloat(formData.availableQuantity)
      } else {
        updateData.availableQuantity = undefined
      }

      await updateVendorItem(item.id, updateData)
      onOpenChange(false)
      onItemUpdated()
    } catch (error) {
      console.error("Failed to update item:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details of your product
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
              <Label htmlFor="availableQuantity">Available Quantity</Label>
              <Input
                id="availableQuantity"
                type="number"
                step="0.01"
                value={formData.availableQuantity}
                onChange={(e) => setFormData({ ...formData, availableQuantity: e.target.value })}
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            <Label htmlFor="isActive" className="m-0 cursor-pointer text-foreground">
              Item is Active (visible to buyers)
            </Label>
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
