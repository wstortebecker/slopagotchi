import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import ZooCard from '../components/ZooCard.jsx'
import { usePet } from '../game/store.jsx'
import { TEAM, playerRow, rankZoo } from '../game/zoo.js'

function SummaryStat({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 22, color: color || 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

export default function Zoo() {
  const navigate = useNavigate()
  const { pet, mood, meters } = usePet()

  const rows = useMemo(() => {
    const me = playerRow(pet, mood, meters.health)
    return rankZoo([me, ...TEAM])
  }, [pet, mood, meters.health])

  const thriving = rows.filter((r) => r.mood === 'thriving').length
  const sick = rows.filter((r) => r.mood === 'sick' || r.mood === 'critical' || r.mood === 'hangry').length
  const gone = rows.filter((r) => r.mood === 'dead').length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar active="zoo" />
      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="pixel-display" style={{ fontSize: 'clamp(20px, 3vw, 28px)', margin: 0 }}>the team zoo</h1>
            <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 15, marginTop: 12, maxWidth: 560 }}>
              Every pet in the company, ranked by slop shipped today. Thriving on top. The
              departed, regrettably, at the bottom. Click your own to go back and grovel.
            </p>
          </div>
          <Card padding={18} style={{ display: 'flex', gap: 28 }}>
            <SummaryStat value={thriving} label="thriving" color="var(--health-thriving)" />
            <SummaryStat value={sick} label="struggling" color="var(--health-warning)" />
            <SummaryStat value={gone} label="expired" color="var(--health-dead)" />
          </Card>
        </div>

        {/* grid */}
        <div className="zoo-grid">
          {rows.map((person, i) => (
            <ZooCard
              key={person.id}
              person={person}
              rank={i + 1}
              onOpen={() => {
                if (person.you) navigate('/play')
              }}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
