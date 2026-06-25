import Stripe from 'stripe'
import { createClerkClient } from '@clerk/backend'
import { json, getUserId } from './_lib.js'

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session (subscription) for the signed-in Clerk
 * user using YOUR Stripe product/price, and returns the redirect URL.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, CLERK_SECRET_KEY
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const userId = await getUserId(req)
  if (!userId) return json(res, 401, { error: 'Not signed in' })

  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID, CLERK_SECRET_KEY } = process.env
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return json(res, 500, { error: 'Stripe is not configured (set STRIPE_SECRET_KEY and STRIPE_PRICE_ID).' })
  }

  try {
    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })
    const user = await clerk.users.getUser(userId)
    const email =
      user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || undefined

    // HashRouter keeps the SPA route after the #, so the ?query stays readable.
    const origin = req.headers.origin || process.env.PUBLIC_BASE_URL || ''
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      metadata: { clerkUserId: userId },
      subscription_data: { metadata: { clerkUserId: userId } },
      allow_promotion_codes: true,
      success_url: `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}#/play`,
      cancel_url: `${origin}/#/play`,
    })
    return json(res, 200, { url: session.url })
  } catch (e) {
    console.error('checkout failed:', e)
    return json(res, 500, { error: 'Could not start checkout.' })
  }
}
