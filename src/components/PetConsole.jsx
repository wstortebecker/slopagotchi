import { Button, DeviceShell, PetScene, PixelIcon } from '../ds/index.js'
import { usePet } from '../game/store.jsx'

/**
 * PetConsole — the egg device plus care actions. The A / B / C buttons and the
 * labelled buttons below both drive the same actions: feed (real commits),
 * praise, and clean slop. A heart floats up on the affectionate ones.
 */
export default function PetConsole() {
  const { pet, mood, message, justActed, actions } = usePet()
  const dead = mood === 'dead'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' }}>
      <div style={{ position: 'relative' }}>
        {justActed > 0 && (
          <div
            key={justActed}
            className="slop-anim"
            style={{
              position: 'absolute',
              left: '50%',
              top: '24%',
              transform: 'translateX(-50%)',
              animation: 'slop-rise 1.2s ease-in forwards',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <PixelIcon name="heart" scale={5} color="var(--accent)" />
          </div>
        )}

        <DeviceShell
          shell={pet.shell}
          width={320}
          fill
          lit={!dead}
          onA={actions.feed}
          onB={actions.praise}
          onC={actions.clean}
        >
          <PetScene species={pet.species} mood={mood} scale={9} />
        </DeviceShell>
      </div>

      {/* speech bubble */}
      <div style={{ maxWidth: 340 }}>
        <div
          style={{
            background: 'var(--lcd-screen)',
            borderRadius: 14,
            padding: '14px 18px',
            boxShadow: 'var(--shadow-screen)',
            fontFamily: 'var(--font-lcd)',
            fontSize: 18,
            color: 'var(--lcd-ink)',
            lineHeight: 1.35,
            textAlign: 'center',
            minHeight: 56,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          “{message}”
        </div>
      </div>

      {/* labelled care actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="primary" size="md" pixel={false} onClick={actions.feed} disabled={dead}>
          Feed
        </Button>
        <Button variant="secondary" size="md" pixel={false} onClick={actions.praise} disabled={dead}>
          Praise
        </Button>
        <Button variant="ink" size="md" pixel={false} onClick={actions.clean} disabled={dead}>
          Clean slop
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
        <span>A · Feed</span>
        <span>B · Praise</span>
        <span>C · Clean</span>
      </div>
    </div>
  )
}
