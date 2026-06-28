import { NextRequest, NextResponse } from "next/server"
import { verifyPaymentSignature } from "@/lib/razorpay"
import { getAdminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentId, signature } = await request.json()

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const isValidSignature = verifyPaymentSignature(orderId, paymentId, signature)
    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const paymentsRef = adminDb.collection("payments")
    const querySnapshot = await paymentsRef.where("razorpayOrderId", "==", orderId).get()

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 })
    }

    const paymentDoc = querySnapshot.docs[0]
    const paymentData = paymentDoc.data()

    await paymentDoc.ref.update({
      status: "success",
      razorpayPaymentId: paymentId,
      updatedAt: Timestamp.now(),
    })

    // paymentData.orderId here is OUR internal order identifier (the
    // `orderId` field on the payments doc, e.g. "ORD-..." or "ORDER-...").
    // It can point at either of two different records depending on which
    // flow created this payment:
    //
    //   1. The "Find a Vendor & Pay" flow (components/vendor/find-vendor-step-b.tsx)
    //      creates a real Firestore `orders/{id}` doc FIRST, using that
    //      doc's own id as orderId — so we look it up by document id and
    //      advance its status to "preparing" (vendor's next step in the
    //      workflow once payment clears).
    //   2. The original requirement checkout flow
    //      (app/donor/checkout/[requirementId]/page.tsx) has no `orders`
    //      doc — it only has a `donationId` on the payment, still
    //      "Pending" at this point, which this advances to "Approved".
    const orderSnap = await adminDb.collection("orders").doc(paymentData.orderId).get()

    if (orderSnap.exists) {
      const orderData = orderSnap.data()

      await orderSnap.ref.update({
        status: "preparing",
        updatedAt: Timestamp.now(),
      })

      // If this order is linked to a donation, mark it as ToBeConfirmed
      // so the donor sees their payment is done and pickup is pending.
      const linkedDonationId = orderData?.donationId ?? paymentData.donationId
      if (linkedDonationId) {
        await adminDb.collection("donations").doc(linkedDonationId).update({
          status: "ToBeConfirmed",
          updatedAt: Timestamp.now(),
        })
      }

      // Deduct the purchased quantity from the vendor item's availableQuantity
      // so the stock count stays accurate after each completed transaction.
      const vendorItemId = orderData?.vendorItemId
      const purchasedQty = orderData?.items?.[0]?.quantity ?? 0
      if (vendorItemId && purchasedQty > 0) {
        const vendorItemRef = adminDb.collection("vendorItems").doc(vendorItemId)
        const vendorItemSnap = await vendorItemRef.get()
        if (vendorItemSnap.exists) {
          const currentQty = vendorItemSnap.data()?.availableQuantity ?? 0
          const newQty = Math.max(0, currentQty - purchasedQty)
          await vendorItemRef.update({
            availableQuantity: newQty,
            updatedAt: Timestamp.now(),
          })
        }
      }
    } else if (paymentData.donationId) {
      await adminDb.collection("donations").doc(paymentData.donationId).update({
        status: "ToBeConfirmed",
        updatedAt: Timestamp.now(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: paymentDoc.id,
    })
  } catch (error) {
    console.error("[payments/verify] error:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}