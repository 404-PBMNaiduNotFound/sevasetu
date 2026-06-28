"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import {
  addRequirement,
  deleteRequirement,
  getMyRequirements,
  updateRequirement,
  completeDonationsByRequirement,
  type RequirementDoc,
} from "@/lib/firestore"

type Status = "Fulfilled" | "Partially Filled" | "Open"

function computeStatus(totalQuantity: number, fulfilledQuantity: number): Status {
  if (totalQuantity <= 0) return "Open"
  if (fulfilledQuantity >= totalQuantity) return "Fulfilled"
  if (fulfilledQuantity > 0) return "Partially Filled"
  return "Open"
}

function getStatus(r: RequirementDoc): Status {
  return r.status ?? computeStatus(r.totalQuantity, r.fulfilledQuantity)
}

function getPercent(r: RequirementDoc): number {
  if (r.totalQuantity <= 0) return 0
  return Math.min(100, Math.round((r.fulfilledQuantity / r.totalQuantity) * 100))
}

const statusBadge: Record<Status, string> = {
  Fulfilled: "bg-green-100 text-green-700",
  "Partially Filled": "bg-amber-100 text-amber-700",
  Open: "bg-red-100 text-red-700",
}

function progressColor(percent: number, status: Status): string {
  if (status === "Fulfilled" || percent >= 100) return "bg-green-500"
  if (percent > 0) return "bg-amber-500"
  return "bg-red-400"
}

function formatQuantity(value: number, unsetWhenZero = false): string | number {
  if (unsetWhenZero && value <= 0) return "—"
  return value
}

const units = ["kg", "L", "pieces", "daily", "other"]
const priorities = ["Low", "Medium", "High"] as const
const categories = ["Food", "Medical", "Education", "Clothing", "Other"]

export function Requirements() {
  const { user } = useAuth()
  const [data, setData] = useState<RequirementDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RequirementDoc | null>(null)
  const [form, setForm] = useState<{
    item: string
    unit: string
    total: string
    fulfilled: string
    description: string
    priority: "High" | "Medium" | "Low"
    category: string
  }>({
    item: "",
    unit: "kg",
    total: "",
    fulfilled: "",
    description: "",
    priority: "Medium",
    category: "Food",
  })

  const loadRequirements = useCallback(async () => {
    if (!user?.uid) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const requirements = await getMyRequirements(user.uid)
      setData(requirements)
    } catch (error) {
      console.error("Failed to load requirements:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    loadRequirements()
  }, [loadRequirements])

  function openAdd() {
    setEditing(null)
    setForm({ 
      item: "", 
      unit: "kg", 
      total: "", 
      fulfilled: "", 
      description: "", 
      priority: "Medium", 
      category: "Food" 
    })
    setDialogOpen(true)
  }

  function openEdit(r: RequirementDoc) {
    setEditing(r)
    setForm({
      item: r.title,
      unit: r.unit,
      total: r.totalQuantity > 0 ? r.totalQuantity.toString() : "",
      fulfilled: r.fulfilledQuantity > 0 ? r.fulfilledQuantity.toString() : "",
      description: r.description || "",
      priority: r.priority || "Medium",
      category: r.category || "Food",
    })
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!user?.uid) return

    try {
      await deleteRequirement(id)
      await loadRequirements()
    } catch (error) {
      console.error("Failed to delete requirement:", error)
    }
  }

  async function handleMarkComplete(r: RequirementDoc) {
    if (!user?.uid || !r.id) return

    const completedQuantity = r.totalQuantity > 0 ? r.totalQuantity : r.fulfilledQuantity

    const payload: Omit<RequirementDoc, "id"> = {
      organizationId: r.organizationId,
      title: r.title,
      description: r.description,
      unit: r.unit,
      totalQuantity: completedQuantity,
      fulfilledQuantity: completedQuantity,
      status: "Fulfilled",
      priority: r.priority,
      category: r.category,
    }

    try {
      await updateRequirement(r.id, payload)
      await completeDonationsByRequirement(r.id, r.organizationId)
      await loadRequirements()
    } catch (error) {
      console.error("Failed to mark requirement as complete:", error)
    }
  }

  async function handleSave() {
    if (!user?.uid) return

    const totalQuantity = form.total === "" ? 0 : Number(form.total)
    const fulfilledQuantity = form.fulfilled === "" ? 0 : Number(form.fulfilled)
    const status = computeStatus(totalQuantity, fulfilledQuantity)

    const payload: Omit<RequirementDoc, "id"> = {
      organizationId: user.uid,
      title: form.item.trim() || "Untitled item",
      description: form.description.trim(),
      unit: form.unit,
      totalQuantity,
      fulfilledQuantity,
      status,
      priority: form.priority as "High" | "Medium" | "Low",
      category: form.category,
    }

    setSaving(true)
    try {
      if (editing?.id) {
        await updateRequirement(editing.id, payload)
      } else {
        await addRequirement(payload)
      }
      setDialogOpen(false)
      await loadRequirements()
    } catch (error) {
      console.error("Failed to save requirement:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8 justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white text-foreground">Requirements</h1>
          <p className="mt-1 text-sm text-white text-muted-foreground">
            Track the supplies your organization needs and how much has been fulfilled.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50  hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Requirement
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow className="border-gray-100 bg-gray-50 hover:bg-gray-50">
                    {["Requirement", "Category", "Total Need", "Fulfilled", "Status", "Priority", "Action"].map(
                      (h) => (
                        <TableHead
                          key={h}
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                            h === "Action" && "text-right",
                          )}
                        >
                          {h}
                        </TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No requirements yet. Add your first supply need to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((r) => {
                      const status = getStatus(r)
                      const percent = getPercent(r)
                      const isFulfilled = status === "Fulfilled"
                      return (
                        <TableRow key={r.id} className="border-gray-100 transition-colors hover:bg-gray-50">
                          <TableCell>
                            <div className="font-semibold text-foreground">{r.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{r.description || "No description"}</div>
                            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={cn("h-full rounded-full", progressColor(percent, status))}
                                style={{ width: `${r.totalQuantity <= 0 ? 0 : percent}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                              {r.category || "General"}
                            </span>
                            <div className="mt-1 text-xs">{r.unit}</div>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatQuantity(r.totalQuantity, true)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatQuantity(r.fulfilledQuantity, r.totalQuantity <= 0 && r.fulfilledQuantity <= 0)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                                statusBadge[status],
                              )}
                            >
                              {status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center text-xs font-medium",
                                r.priority === "High" ? "text-red-600" : r.priority === "Medium" ? "text-amber-600" : "text-green-600"
                              )}
                            >
                              <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", 
                                r.priority === "High" ? "bg-red-600" : r.priority === "Medium" ? "bg-amber-600" : "bg-green-600"
                              )} />
                              {r.priority || "Medium"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {/* Mark Complete button */}
                              <button
                                type="button"
                                onClick={() => !isFulfilled && handleMarkComplete(r)}
                                disabled={isFulfilled}
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                                  isFulfilled
                                    ? "text-green-500 cursor-default"
                                    : "text-muted-foreground hover:bg-green-50 hover:text-green-600"
                                )}
                                aria-label={isFulfilled ? `${r.title} is already fulfilled` : `Mark ${r.title} as complete`}
                                title={isFulfilled ? "Already fulfilled" : "Mark as complete"}
                              >
                                <CheckCircle2 className={cn("h-4 w-4", isFulfilled && "fill-green-100")} />
                              </button>

                              {/* Edit button — hidden when fulfilled */}
                              {!isFulfilled && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(r)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-50 hover:text-primary"
                                  aria-label={`Edit ${r.title}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => r.id && handleDelete(r.id)}
                                disabled={!r.id}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
                                aria-label={`Delete ${r.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{data.length}</span> requirements
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1 rounded-xl" disabled>
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button variant="outline" size="sm" className="gap-1 rounded-xl" disabled>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details for this requirement."
                : "Add a new supply requirement for your organization."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item">Item Name</Label>
              <Input
                id="item"
                value={form.item}
                onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                placeholder="e.g. Rice"
                className="rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger id="unit" className="rounded-xl">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details..."
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as any }))}>
                  <SelectTrigger id="priority" className="rounded-xl">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger id="category" className="rounded-xl">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="total">Total Needed</Label>
                <Input
                  id="total"
                  type="number"
                  min={0}
                  value={form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                  placeholder="0"
                  className="rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fulfilled">Current Fulfilled</Label>
                <Input
                  id="fulfilled"
                  type="number"
                  min={0}
                  value={form.fulfilled}
                  onChange={(e) => setForm((f) => ({ ...f, fulfilled: e.target.value }))}
                  placeholder="0"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}