"use client"

/**
 * components/vendor/find-vendor-step-a.tsx  (UPDATED)
 *
 * Adds a "Nearby Vendors" map section below the item search results.
 * Paste this over components/vendor/find-vendor-step-a.tsx
 */

import { useState, useEffect } from "react"
import { searchVendorItemsByName, VendorItemDoc } from "@/lib/firestore"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, Store, MapPin } from "lucide-react"
import { NearbyMap } from "@/components/map/NearbyMap"

interface FindVendorStepAProps {
  donation: any
  onItemSelected: (item: VendorItemDoc) => void
}

export function FindVendorStepA({ donation, onItemSelected }: FindVendorStepAProps) {
  const [results, setResults] = useState<VendorItemDoc[]>([])
  const [searching, setSearching] = useState(true)
  const [showNearbyMap, setShowNearbyMap] = useState(false)

  // For meal-sponsorship (slot-based) donations, itemName is stored as "meals".
  // Fall back to "meals" if itemName is missing but a meals count is present.
  const searchTerm = donation?.itemName ?? (donation?.meals != null ? "meals" : "")

  useEffect(() => {
    let cancelled = false
    async function run() {
      setSearching(true)
      try {
        const items = await searchVendorItemsByName(searchTerm)
        if (!cancelled) setResults(items)
      } catch (error) {
        console.error("Vendor search failed:", error)
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }
    if (searchTerm) run()
    else setSearching(false)
    return () => { cancelled = true }
  }, [searchTerm])

  return (
    <div className="space-y-6">
      {/* Requirement banner */}
      <div className="bg-blue-50 border border-action-blue/20 rounded-lg p-4">
        <p className="text-sm text-navy-primary">
          {donation.meals != null && !donation.requirementId ? (
            <>
              <span className="font-semibold">Meal Sponsorship:</span> {donation.meals} meals
              {donation.slotId ? "" : ""}
            </>
          ) : (
            <>
              <span className="font-semibold">Requirement:</span> {donation.itemName} ({donation.quantity} {donation.unit})
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {donation.meals != null && !donation.requirementId
            ? "Select a vendor below to fulfil this meal sponsorship."
            : "Quantity is fixed from your approved request — select a vendor below to see their price for this item."}
        </p>
      </div>

      {/* Vendor item results */}
      {searching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-action-blue" />
        </div>
      ) : results.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              No vendors currently list &quot;{searchTerm}&quot;
            </p>
            <p className="text-sm text-muted-foreground mt-2">Check back soon.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-navy-primary">
            Found {results.length} vendor{results.length !== 1 ? "s" : ""} selling {searchTerm}
          </p>
          {results.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-primary">{item.vendorName}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.itemName}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Price per Unit</p>
                      <p className="font-semibold text-success-green">₹{item.pricePerUnit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unit</p>
                      <p className="font-medium">{item.unit}</p>
                    </div>
                    {item.availableQuantity !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="font-medium">{item.availableQuantity}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => onItemSelected(item)}
                  className="gap-2 bg-vendor-orange hover:bg-vendor-orange/90 text-white shrink-0"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Select This Vendor
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Nearby Vendors map section ── */}
      <div className="border-t border-border pt-6">
        <button
          className="flex items-center gap-2 text-sm font-medium text-action-blue mb-4 hover:underline"
          onClick={() => setShowNearbyMap((v) => !v)}
        >
          <MapPin className="w-4 h-4" />
          {showNearbyMap ? "Hide" : "Show"} Nearby Vendors on Map
        </button>

        {showNearbyMap && (
          <Card className="p-4">
            <NearbyMap mode="vendors" radiusKm={30} mapHeight="360px" />
          </Card>
        )}
      </div>
    </div>
  )
}