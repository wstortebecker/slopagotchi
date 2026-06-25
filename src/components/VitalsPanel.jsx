import { Card, PixelIcon, StatMeter, StatusBadge } from '../ds/index.js'
import { usePet } from '../game/store.jsx'
import { relTime } from '../game/engine.js'

/**
 * VitalsPanel — name + status, the three vital meters, today's slop tally, and
 * the rolling list of slop incidents.
 */
export default function VitalsPanel() {
  const { pet, status, meters } = usePet()
  const now = Date.now()
  const slopToday = pet.slopToday
  const heavy = slopToday > 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 480 }}>
      {/* identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, color: 'var(--ink)' }}>{pet.name}</div>
        <StatusBadge status={status} />
      </div>

      {/* vitals */}
      <Card padding={18} radius={2} style={{ boxShadow: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatMeter label="Health" value={meters.health} max={4} />
          <StatMeter label="Hunger" value={meters.hunger} max={4} />
          <StatMeter label="Slop" value={meters.slop} max={5} invert color="var(--slop)" />
        </div>
      </Card>

      {/* slop today */}
      <Card padding={18} tone={heavy ? 'accent' : 'default'} radius={2} style={{ boxShadow: 'none' }}>
        <div className="section-label">Slop shipped today</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 26,
            color: heavy ? 'var(--accent-press)' : 'var(--ink)',
            marginTop: 10,
            minHeight: 26,
          }}
        >
          {slopToday} <span style={{ fontSize: 11 }}>lines</span>
        </div>
      </Card>

      {/* incidents */}
      <Card padding={0} radius={2} style={{ boxShadow: 'none' }}>
        <div className="section-label" style={{ padding: '14px 18px 8px' }}>
          Recent slop incidents
        </div>
        {pet.incidents.length === 0 ? (
          <div style={{ padding: '8px 18px 18px', fontFamily: 'var(--font-lcd)', fontSize: 15, color: 'var(--ink-3)' }}>
            no slop incidents yet. suspicious, but i'll take it.
          </div>
        ) : (
          <div>
            {pet.incidents.map((it, i) => (
              <div
                key={it.ts || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <PixelIcon name={it.lines > 200 ? 'skull' : it.lines > 40 ? 'slop' : 'bolt'} scale={3} color="var(--slop)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                    {it.repo} · {it.lines} lines
                  </div>
                  <div style={{ fontFamily: 'var(--font-lcd)', fontSize: 14, color: 'var(--ink-3)' }}>“{it.verdict}”</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{relTime(it.ts, now)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
