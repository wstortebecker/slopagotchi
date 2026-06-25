import { SignIn } from '@clerk/clerk-react'
import { DeviceShell, PetScene } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'

/**
 * Inline sign-in / sign-up shown when a signed-out visitor tries to enter a
 * protected route (e.g. presses "Hatch your egg"). routing="virtual" keeps it
 * embedded so it plays nicely with the app's HashRouter.
 */
export default function AuthScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '48px 24px' }}>
      <div style={{ display: 'grid', gap: 24, justifyItems: 'center' }}>
        <Logo size={30} />
        <DeviceShell shell="bubblegum" width={180} fill>
          <PetScene mood="happy" scale={5} />
        </DeviceShell>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-2)', margin: 0, textAlign: 'center', maxWidth: 360 }}>
          Sign in to hatch your pet and take your spot in the team zoo.
        </p>
        <SignIn routing="virtual" />
      </div>
    </div>
  )
}
