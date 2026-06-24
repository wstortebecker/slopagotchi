/**
 * LcdScreen — the sunken olive LCD panel. Wraps any screen content (a Pet,
 * pixel text, stats) behind a black bezel with the faint dot-matrix grid and an
 * inset shadow so it reads as a real low-res display.
 *
 * `fill` makes the content layer fill the screen (position:absolute) instead of
 * shrink-wrapping centered — use it for a PetScene that positions its own props.
 */
export default function LcdScreen({
  theme = 'olive',
  lit = true,
  scanlines = false,
  fill = false,
  width,
  height,
  pad = 14,
  bezel = true,
  className = '',
  style = {},
  children,
  ...rest
}) {
  const screen = theme === 'lime' ? 'var(--lcd-lime-screen)' : 'var(--lcd-screen)'
  const screenLit = theme === 'lime' ? 'var(--lcd-lime-screen)' : 'var(--lcd-screen-lit)'

  const screenEl = (
    <div
      style={{
        position: 'relative',
        width: width || '100%',
        height: height || '100%',
        background: lit ? screenLit : screen,
        borderRadius: 'var(--radius-screen)',
        boxShadow: 'var(--shadow-screen)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: pad,
        boxSizing: 'border-box',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'var(--lcd-grid-overlay)',
          backgroundSize: 'var(--lcd-grid-size)',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
          opacity: 0.5,
        }}
      />
      {scanlines && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 3px)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        style={
          fill
            ? { position: 'absolute', inset: pad, zIndex: 1 }
            : { position: 'relative', zIndex: 1, textAlign: 'center' }
        }
      >
        {children}
      </div>
    </div>
  )

  if (!bezel) {
    return (
      <div className={className} style={{ ...style }} {...rest}>
        {screenEl}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        background: 'var(--lcd-bezel)',
        padding: 12,
        borderRadius: 'calc(var(--radius-screen) + 10px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 6px rgba(0,0,0,0.5)',
        ...style,
      }}
      {...rest}
    >
      {screenEl}
    </div>
  )
}
