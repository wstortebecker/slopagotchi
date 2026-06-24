import { useNavigate } from 'react-router-dom'
import { Button, Card, PixelIcon } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import PetConsole from '../components/PetConsole.jsx'
import VitalsPanel from '../components/VitalsPanel.jsx'
import { usePet } from '../game/store.jsx'

function Memorial() {
  const navigate = useNavigate()
  const { pet, message, actions } = usePet()
  const startFresh = () => {
    actions.resetEgg()
    navigate('/hatch')
  }
  return (
    <Card tone="ink" padding={24} style={{ width: '100%', maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <PixelIcon name="skull" scale={4} color="var(--paper)" />
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, color: 'var(--paper)' }}>rest in pieces, {pet.name}</div>
      </div>
      <p style={{ fontFamily: 'var(--font-lcd)', fontSize: 16, color: 'rgba(251,250,242,0.8)', lineHeight: 1.4, marginBottom: 20 }}>
        “{message}”
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" size="md" pixel={false} onClick={() => actions.revive()}>
          Revive {pet.name}
        </Button>
        <Button variant="ghost" size="md" pixel={false} onClick={startFresh} style={{ color: 'var(--paper)', borderColor: 'rgba(251,250,242,0.4)' }}>
          Pick a new pet
        </Button>
      </div>
    </Card>
  )
}

export default function Personal() {
  const navigate = useNavigate()
  const { mood, actions } = usePet()
  const dead = mood === 'dead'

  const reHatch = () => {
    actions.resetEgg()
    navigate('/hatch')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar active="mine" />
      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        <div className="play-grid">
          {/* console column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
            <PetConsole />
          </div>

          {/* vitals column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', width: '100%' }}>
            {dead && <Memorial />}
            <VitalsPanel />
            <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={reHatch}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}
              >
                start over with a new egg →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
