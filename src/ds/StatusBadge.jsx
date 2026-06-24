import PixelIcon from './PixelIcon.jsx'

const STATUS = {
  thriving: { label: 'Thriving', color: 'var(--health-thriving)', icon: 'sprout' },
  ok: { label: 'OK', color: 'var(--health-ok)', icon: 'check' },
  sick: { label: 'Sick', color: 'var(--health-warning)', icon: 'slop' },
  critical: { label: 'Critical', color: 'var(--health-danger)', icon: 'bolt' },
  slop: { label: 'Full Slop', color: 'var(--slop)', icon: 'slop' },
  dead: { label: 'Expired', color: 'var(--health-dead)', icon: 'skull' },
}

// Build a translucent version of any CSS colour for subtle backgrounds.
function color2soft(c) {
  return `color-mix(in srgb, ${c} 16%, white)`
}

/**
 * StatusBadge — a pill summarising a pet's health, with a pixel glyph. Solid
 * tint by default; `subtle` for a soft tinted background instead.
 */
export default function StatusBadge({
  status = 'ok',
  subtle = false,
  showIcon = true,
  className = '',
  style = {},
  ...rest
}) {
  const s = STATUS[status] || STATUS.ok
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 28,
        padding: '0 12px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-body)',
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: '0.01em',
        color: subtle ? s.color : '#fff',
        background: subtle ? color2soft(s.color) : s.color,
        border: subtle ? `1.5px solid ${s.color}` : 'none',
        boxShadow: subtle ? 'none' : '0 2px 0 rgba(0,0,0,0.12)',
        ...style,
      }}
      {...rest}
    >
      {showIcon && <PixelIcon name={s.icon} scale={2.5} color={subtle ? s.color : '#fff'} />}
      {s.label}
    </span>
  )
}
