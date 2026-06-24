import LcdScreen from './LcdScreen.jsx'

const SHELL_PRESETS = {
  bubblegum: 'var(--shell-bubblegum)',
  sky: 'var(--shell-sky)',
  lemon: 'var(--shell-lemon)',
  lime: 'var(--shell-lime)',
  grape: 'var(--shell-grape)',
  tangerine: 'var(--shell-tangerine)',
  clear: 'var(--shell-clear)',
}

/**
 * DeviceShell — the egg-shaped plastic virtual-pet toy. Glossy moulded shell, a
 * key-ring nub up top, a sunken LCD screen (pass screen content as children)
 * and the three signature A / B / C buttons along the bottom.
 *
 * Compose a Pet (or any screen content) as children; wire onA/onB/onC.
 */
export default function DeviceShell({
  shell = 'bubblegum',
  theme = 'olive',
  lit = true,
  fill = false,
  label = 'SLOPAGOTCHI',
  buttons = ['A', 'B', 'C'],
  buttonTitles = [],
  onA,
  onB,
  onC,
  width = 300,
  className = '',
  style = {},
  children,
  ...rest
}) {
  const shellColor = SHELL_PRESETS[shell] || shell
  const handlers = [onA, onB, onC]

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        padding: `${width * 0.12}px ${width * 0.1}px ${width * 0.09}px`,
        backgroundColor: shellColor,
        backgroundImage: 'var(--gloss-radial)',
        borderRadius: 'var(--radius-egg)',
        boxShadow:
          'var(--shadow-plastic), inset 0 -10px 26px rgba(0,0,0,0.18), inset 0 6px 14px rgba(255,255,255,0.45)',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      {/* key-ring nub */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 34,
          height: 22,
          borderRadius: '12px 12px 4px 4px',
          background: shellColor,
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'transparent',
            border: '3px solid rgba(0,0,0,0.28)',
          }}
        />
      </div>

      {/* embossed wordmark */}
      <div
        style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 9,
          letterSpacing: '0.04em',
          color: 'rgba(0,0,0,0.42)',
          textAlign: 'center',
          marginBottom: 10,
          userSelect: 'none',
        }}
      >
        {label}
      </div>

      <LcdScreen theme={theme} lit={lit} fill={fill} height={width * 0.62} style={{ marginBottom: width * 0.07 }}>
        {children}
      </LcdScreen>

      {/* A / B / C buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: width * 0.09 }}>
        {buttons.map((b, i) => {
          const mid = i === 1
          const size = mid ? width * 0.16 : width * 0.15
          return (
            <button
              key={`${b}-${i}`}
              type="button"
              onClick={handlers[i]}
              title={buttonTitles[i] || undefined}
              aria-label={buttonTitles[i] || (typeof b === 'string' ? b : `Button ${i + 1}`)}
              style={{
                width: size,
                height: size,
                marginBottom: mid ? -width * 0.04 : 0,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'rgba(0,0,0,0.78)',
                backgroundImage:
                  'radial-gradient(120% 90% at 35% 25%, rgba(255,255,255,0.5), rgba(255,255,255,0) 55%)',
                boxShadow: '0 4px 0 rgba(0,0,0,0.35), inset 0 -2px 4px rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'var(--font-pixel)',
                fontSize: 9,
                display: 'grid',
                placeItems: 'center',
                transition: 'transform var(--dur-fast) var(--ease-snap)',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(3px)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {typeof b === 'string' && b.length <= 2 ? b : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
