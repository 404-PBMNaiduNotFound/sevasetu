import { NextRequest, NextResponse } from "next/server"
import { getRazorpayInstance } from "@/lib/razorpay"
import { getAdminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const {
      amount,
      orderId,
      donorId,
      donorName,
      donorEmail,
      donorPhone,
      requirementId,
      organizationId,
      donationId,
    } = await request.json()

    if (!amount || !donorId || !donorEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const razorpayOrder = await getRazorpayInstance().orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: orderId,
      notes: {
        donorId,
        donorName,
        ...(requirementId ? { requirementId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
    })

    const paymentDoc = await getAdminDb().collection("payments").add({
      razorpayOrderId: razorpayOrder.id,
      orderId,
      donorId,
      donorName,
      donorEmail,
      donorPhone: donorPhone ?? "",
      requirementId: requirementId ?? null,
      organizationId: organizationId ?? null,
      donationId: donationId ?? null,
      amount,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      docId: paymentDoc.id,
    })
  } catch (error) {
    console.error("[payments/create-order] error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
