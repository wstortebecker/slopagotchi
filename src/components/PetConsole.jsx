import { useEffect, useRef } from 'react'
import { DeviceShell, PetScene, PixelIcon } from '../ds/index.js'
import { usePet } from '../game/store.jsx'

/* Which glyph floats up for each care action. */
const REACTION = {
  feed: { icon: 'heart', color: 'var(--accent)' },
  praise: { icon: 'star', color: 'var(--health-warning)' },
  clean: { icon: 'sprout', color: 'var(--health-thriving)' },
}

/**
 * PetConsole — the egg device. The three signature A / B / C buttons feed,
 * praise, and clean: each press makes the pet react (a glyph floats up and the
 * whole device gives a little squish) and updates the speech bubble.
 */
export default function PetConsole() {
  const { pet, mood, message, reaction, actions } = usePet()
  const dead = mood === 'dead'
  const popRef = useRef(null)

  // Restart the squish animation on every reaction without remounting the
  // device (which would reset the creature's animation frame).
  useEffect(() => {
    const el = popRef.current
    if (!el || !reaction.id) return
    el.style.animation = 'none'
    void el.offsetWidth // force reflow
    el.style.animation = 'slop-react 420ms var(--ease-bounce)'
  }, [reaction.id])

  const r = reaction.kind ? REACTION[reaction.kind] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' }}>
      <div style={{ position: 'relative' }}>
        {r && reaction.id > 0 && (
          <div
            key={reaction.id}
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
            <PixelIcon name={r.icon} scale={5} color={r.color} />
          </div>
        )}

        <div ref={popRef} style={{ transformOrigin: 'center bottom' }}>
          <DeviceShell
            shell={pet.shell}
            width={320}
            fill
            lit={!dead}
            buttonTitles={['Feed', 'Praise', 'Clean slop']}
            onA={actions.feed}
            onB={actions.praise}
            onC={actions.clean}
          >
            <PetScene species={pet.species} mood={mood} scale={9} />
          </DeviceShell>
        </div>
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
    </div>
  )
}
