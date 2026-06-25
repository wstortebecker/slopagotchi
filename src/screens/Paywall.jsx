import { PricingTable } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { DeviceShell, PetScene } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'
import PaymentBadges from '../components/PaymentBadges.jsx'

/**
 * Shown to a signed-in user who does not yet have an active subscription.
 * <PricingTable /> renders the plans configured in the Clerk Dashboard and
 * runs checkout through Clerk Billing (Stripe is the processor behind it).
 * Once the subscription is active, the surrounding <Protect> re-renders to
 * the app.
 */
export default function Paywall() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 880, display: 'grid', gap: 28, justifyItems: 'center' }}>
        <Logo size={30} />

        <DeviceShell shell="bubblegum" width={200} fill>
          <PetScene mood="hangry" scale={6} />
        </DeviceShell>

        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <h1 className="pixel-display" style={{ fontSize: 'clamp(22px, 3.4vw, 30px)', margin: 0 }}>
            your pet needs a <span style={{ color: 'var(--accent)' }}>subscription</span>.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: '14px 0 0' }}>
            Keeping your pet alive — and out of the bottom of the team zoo — is the part we charge
            for. $20 a seat: go solo or bring the whole team. Self-serve, cancel anytime.
          </p>
        </div>

        <div style={{ width: '100%' }}>
          <PricingTable />
        </div>

        <PaymentBadges style={{ justifyContent: 'center' }} />

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', margin: 0, textAlign: 'center' }}>
          Secure checkout · billing managed by Clerk &amp; Stripe · 256-bit SSL
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', margin: 0, textAlign: 'center' }}>
          By subscribing you agree to our{' '}
          <Link to="/terms" style={{ color: 'var(--accent)', fontWeight: 800 }}>
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 800 }}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
