/**
 * Clerk Billing plan slug.
 *
 * This must match the *slug* of the plan you create in the Clerk Dashboard
 * (Billing → Subscription plans → Plans for Users → Add Plan). Plans live in
 * Clerk — Clerk does NOT import or sync existing Stripe products; Stripe is
 * only the payment processor behind the scenes.
 * Update this constant if you name your plan something other than "pro".
 */
export const PLAN_SLUG = 'pro'
