/**
 * Logo — the egg mark + pixel wordmark lockup. Presentational; wrap it in a
 * link/handler for navigation. The little olive screen has the brand's two-dot
 * eyes and a flat mouth.
 */
export default function Logo({ size = 34, showWord = true, color = 'var(--accent)' }) {
  const h = size
  const w = size * 0.82
  const eye = Math.max(3, size * 0.11)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.34 }}>
      <div
        style={{
          position: 'relative',
          width: w,
          height: h,
          backgroundColor: color,
          backgroundImage: 'var(--gloss-radial)',
          borderRadius: 'var(--radius-egg)',
          boxShadow: 'var(--shadow-plastic-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {/* key-ring nub */}
        <span
          style={{
            position: 'absolute',
            top: -size * 0.09,
            left: '50%',
            transform: 'translateX(-50%)',
            width: w * 0.28,
            height: size * 0.16,
            borderRadius: '6px 6px 2px 2px',
            background: color,
          }}
        />
        <div
          style={{
            position: 'relative',
            width: w * 0.58,
            height: h * 0.4,
            background: 'var(--lcd-screen)',
            borderRadius: 4,
            boxShadow: 'var(--shadow-screen)',
          }}
        >
          <span style={{ position: 'absolute', top: '30%', left: '24%', width: eye, height: eye, background: 'var(--lcd-ink)' }} />
          <span style={{ position: 'absolute', top: '30%', right: '24%', width: eye, height: eye, background: 'var(--lcd-ink)' }} />
          <span
            style={{
              position: 'absolute',
              bottom: '22%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: eye * 2.4,
              height: eye * 0.8,
              background: 'var(--lcd-ink)',
            }}
          />
        </div>
      </div>
      {showWord && (
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: size * 0.42, color, letterSpacing: '0.01em' }}>
          slopagotchi
        </span>
      )}
    </div>
  )
}
