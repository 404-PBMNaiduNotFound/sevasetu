import type { DonationDoc } from "@/lib/firestore"

const styles: Record<DonationDoc["status"], string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-green-100 text-green-700",
  ToBeConfirmed: "bg-purple-100 text-purple-700",
  Completed: "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
}

const labels: Record<DonationDoc["status"], string> = {
  Pending: "Pending",
  Approved: "Approved",
  ToBeConfirmed: "Awaiting Pickup",
  Completed: "Completed",
  Rejected: "Rejected",
}

export function StatusBadge({ status }: { status: DonationDoc["status"] }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  )
}