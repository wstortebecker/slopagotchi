import { Card, LcdScreen, PetScene, PixelIcon, StatMeter, StatusBadge } from '../ds/index.js'

const MOOD_TO_STATUS = {
  thriving: 'thriving',
  happy: 'ok',
  ok: 'ok',
  hangry: 'sick',
  sick: 'sick',
  critical: 'critical',
  dead: 'dead',
}

/** One employee's pet tile in the Team Zoo. */
export default function ZooCard({ person, rank, onOpen }) {
  const dead = person.mood === 'dead'
  const heavy = person.slopToday > 50
  const you = !!person.you

  return (
    <Card
      padding={16}
      interactive
      onClick={onOpen}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        border: you ? '2px solid var(--accent)' : undefined,
      }}
    >
      {/* rank + you tag */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 9,
            color: 'var(--ink-3)',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            padding: '4px 7px',
          }}
        >
          #{rank}
        </span>
        {you && (
          <span
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 9,
              color: '#fff',
              background: 'var(--accent)',
              borderRadius: 999,
              padding: '4px 7px',
            }}
          >
            you
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <LcdScreen width={160} height={108} lit={!dead} fill>
          {/* PetScene (not the bare Pet) so the tile shows the same mood-driven
              scenes as My Pet — thermometer when sick, hospital rig when
              critical, the gallows when it's over. */}
          <PetScene species={person.species} mood={person.mood} scale={5} />
        </LcdScreen>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person.pet}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person.name} · {person.role}
          </div>
        </div>
        <StatusBadge status={MOOD_TO_STATUS[person.mood]} subtle />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <StatMeter label="HP" value={person.health} max={4} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 800,
            color: heavy ? 'var(--accent-press)' : 'var(--ink-3)',
          }}
        >
          <PixelIcon name={heavy ? 'slop' : 'check'} scale={2.5} color={heavy ? 'var(--slop)' : 'var(--health-ok)'} />
          {person.slopToday}L
        </div>
      </div>
    </Card>
  )
}
