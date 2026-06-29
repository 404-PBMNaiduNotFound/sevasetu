import { NextRequest, NextResponse } from "next/server"
import { refundPayment } from "@/lib/razorpay"
import { getAdminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

// Order statuses a donor is still allowed to cancel from. Once an order is
// "picked_up" the donation is treated as fulfilled, so it can no longer be
// cancelled from here.
const CANCELLABLE_STATUSES = ["payment_confirmed", "preparing", "ready_for_pickup"]

export async function POST(request: NextRequest) {
  try {
    const { orderId, donorId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const orderRef = adminDb.collection("orders").doc(orderId)
    const orderSnap = await orderRef.get()

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = orderSnap.data() as any

    // Ownership check — only the donor who placed this order can cancel it.
    // (donorId is optional in the request body for backwards compatibility,
    // but when present it must match the order's donor.)
    if (donorId && order.donorId && order.donorId !== donorId) {
      return NextResponse.json({ error: "You are not authorized to cancel this order" }, { status: 403 })
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: `Order cannot be cancelled once it is "${order.status}".` },
        { status: 400 }
      )
    }

    // Find the matching payment record so we have the real Razorpay
    // payment id to refund. IMPORTANT: payments.orderId is the Firestore
    // DOCUMENT ID of this order (see app/api/payments/verify, which looks
    // it up the same way: adminDb.collection("orders").doc(paymentData.orderId)),
    // NOT the human-readable order.orderId field (e.g. "ORD-..."). The
    // "Find a Vendor & Pay" flow creates the order doc first, then passes
    // that doc's own id as `orderId` into /api/payments/create-order —
    // so that's the value stored on the payment.
    const paymentsSnap = await adminDb
      .collection("payments")
      .where("orderId", "==", orderSnap.id)
      .limit(1)
      .get()

    if (paymentsSnap.empty) {
      return NextResponse.json({ error: "Payment record not found for this order" }, { status: 404 })
    }

    const paymentDoc = paymentsSnap.docs[0]
    const payment = paymentDoc.data()

    if (!payment.razorpayPaymentId) {
      return NextResponse.json({ error: "No completed payment found to refund" }, { status: 400 })
    }

    if (payment.status === "refunded") {
      return NextResponse.json({ error: "This payment has already been refunded" }, { status: 400 })
    }

    // Issue the actual refund — money back to the donor's original
    // payment method. If this throws, nothing below runs, so the order
    // is left exactly as it was and the donor can retry.
    const refund = await refundPayment(payment.razorpayPaymentId, order.amount)

    const now = Timestamp.now()

    await orderRef.update({
      status: "cancelled_by_donor",
      cancelledAt: now,
      refundId: refund.id,
      updatedAt: now,
    })

    await paymentDoc.ref.update({
      status: "refunded",
      updatedAt: now,
    })

    // Mark the linked donation cancelled too, so it drops out of every
    // "Total Amount Donated/Received" stat card (those only count
    // status === "Completed") and shows the right state to the org.
    const donationId = order.donationId
    if (donationId) {
      await adminDb.collection("donations").doc(donationId).update({
        status: "CancelledByDonor",
        updatedAt: now,
      })
    }

    // Restore the stock that was deducted from the vendor's item when
    // payment was originally confirmed (see app/api/payments/verify).
    const vendorItemId = order.vendorItemId
    const purchasedQty = order.items?.[0]?.quantity ?? 0
    if (vendorItemId && purchasedQty > 0) {
      const vendorItemRef = adminDb.collection("vendorItems").doc(vendorItemId)
      const vendorItemSnap = await vendorItemRef.get()
      if (vendorItemSnap.exists) {
        const currentQty = vendorItemSnap.data()?.availableQuantity
        // Only restore if this item still tracks a stock cap — items with
        // no cap (availableQuantity undefined) had nothing deducted.
        if (currentQty !== undefined && currentQty !== null) {
          await vendorItemRef.update({
            availableQuantity: currentQty + purchasedQty,
            updatedAt: now,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
    })
  } catch (error) {
    console.error("[orders/cancel] error:", error)
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 })
  }
}
