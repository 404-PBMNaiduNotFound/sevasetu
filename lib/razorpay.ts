import Razorpay from 'razorpay'
import crypto from 'crypto'

// Lazily constructed so importing this module (which Next.js does during
// `next build`'s page-data collection, even for routes that won't run yet)
// never throws just because RAZORPAY_KEY_ID/SECRET aren't set at build time.
// The error only surfaces when a request actually tries to use the client,
// which is the correct place for it to fail.
let _razorpayInstance: Razorpay | null = null

export function getRazorpayInstance(): Razorpay {
  if (_razorpayInstance) return _razorpayInstance

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      'Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment (see .env.example).'
    )
  }

  _razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret })
  return _razorpayInstance
}

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    throw new Error('Missing RAZORPAY_KEY_SECRET in your environment (see .env.example).')
  }
  const data = `${orderId}|${paymentId}`
  const generated_signature = crypto
    .createHmac('sha256', keySecret)
    .update(data)
    .digest('hex')

  return generated_signature === signature
}
