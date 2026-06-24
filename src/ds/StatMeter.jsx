/**
 * StatMeter — an LCD-style segmented gauge for a pet vital (Hunger, Health,
 * Discipline, Slop). Renders a labelled row of filled/empty pixel segments, the
 * classic virtual-pet heart-meter pattern.
 */
export default function StatMeter({
  label = 'Health',
  value = 3,
  max = 4,
  segments,
  color = 'var(--lcd-ink)',
  track = 'var(--lcd-ink-soft)',
  invert = false,
  onScreen = false,
  className = '',
  style = {},
  ...rest
}) {
  const count = segments || max
  const filled = Math.round((value / max) * count)
  const labelColor = onScreen ? 'var(--lcd-ink)' : 'var(--text-body)'
  const segColor = onScreen ? 'var(--lcd-ink)' : color

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-lcd)', ...style }}
      {...rest}
    >
      <span
        style={{
          fontSize: onScreen ? 14 : 13,
          fontWeight: 600,
          color: labelColor,
          minWidth: 64,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: count }).map((_, i) => {
          const on = invert ? i >= count - filled : i < filled
          return (
            <span
              key={i}
              style={{
                width: 14,
                height: 12,
                background: on ? segColor : 'transparent',
                border: `2px solid ${on ? segColor : onScreen ? 'var(--lcd-ink-soft)' : track}`,
                borderRadius: 2,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
