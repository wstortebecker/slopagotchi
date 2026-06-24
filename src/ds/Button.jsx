const VARIANTS = {
  primary: { '--bg': 'var(--accent)', '--bgPress': 'var(--accent-press)', '--fg': 'var(--accent-ink)' },
  secondary: { '--bg': 'var(--accent-2)', '--bgPress': 'var(--accent-2-press)', '--fg': '#ffffff' },
  ink: { '--bg': 'var(--ink)', '--bgPress': '#000000', '--fg': '#ffffff' },
  ghost: { '--bg': 'transparent', '--bgPress': 'var(--paper-2)', '--fg': 'var(--ink)' },
}

const SIZES = {
  sm: { height: 'var(--btn-h-sm)', padding: '0 16px', font: 12, drop: 4 },
  md: { height: 'var(--btn-h)', padding: '0 22px', font: 14, drop: 5 },
  lg: { height: 60, padding: '0 30px', font: 16, drop: 6 },
}

/**
 * Button — chunky candy-plastic button. Pixel-cap label sits on a coloured base
 * it visually presses into. Primary = bubblegum pink.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  pixel = true,
  block = false,
  disabled = false,
  type = 'button',
  className = '',
  style = {},
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  const ghost = variant === 'ghost'

  const reset = (e) => {
    if (disabled || ghost) return
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = `0 ${s.drop}px 0 var(--bgPress)`
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={className}
      style={{
        ...v,
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: s.height,
        padding: s.padding,
        fontFamily: pixel ? 'var(--font-pixel)' : 'var(--font-body)',
        fontSize: pixel ? s.font - 2 : s.font + 1,
        fontWeight: pixel ? 400 : 800,
        letterSpacing: pixel ? '0.02em' : 'var(--tracking-caps)',
        textTransform: pixel ? 'none' : 'uppercase',
        color: 'var(--fg)',
        background: 'var(--bg)',
        border: ghost ? '2px solid var(--line-2)' : 'none',
        borderRadius: 'var(--radius-pill)',
        boxShadow: ghost ? 'none' : `0 ${s.drop}px 0 var(--bgPress)`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: 'translateY(0)',
        transition:
          'transform var(--dur-fast) var(--ease-snap), box-shadow var(--dur-fast) var(--ease-snap)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseDown={(e) => {
        if (disabled || ghost) return
        e.currentTarget.style.transform = `translateY(${s.drop}px)`
        e.currentTarget.style.boxShadow = '0 0 0 var(--bgPress)'
      }}
      onMouseUp={reset}
      onMouseLeave={reset}
      {...rest}
    >
      {children}
    </button>
  )
}
