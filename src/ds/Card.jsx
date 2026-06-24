import { useState } from 'react'

const TONES = {
  default: { background: 'var(--surface-card)', border: '1px solid var(--line)' },
  sunken: { background: 'var(--surface-sunken)', border: '1px solid var(--line)' },
  accent: { background: 'var(--accent-soft)', border: '1px solid #f6c6dc' },
  ink: { background: 'var(--ink)', border: '1px solid #000', color: 'var(--paper)' },
}

/**
 * Card — a rounded plastic surface. Default white with a soft lift; `tone` tints
 * it. `padding` and `interactive` (adds a hover lift) are common knobs.
 */
export default function Card({
  tone = 'default',
  padding = 20,
  radius = 'var(--radius-lg)',
  interactive = false,
  className = '',
  style = {},
  children,
  ...rest
}) {
  const t = TONES[tone] || TONES.default
  const [hover, setHover] = useState(false)
  return (
    <div
      className={className}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        ...t,
        padding,
        borderRadius: radius,
        boxShadow: interactive && hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transform: interactive && hover ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform var(--dur-base) var(--ease-bounce), box-shadow var(--dur-base)',
        cursor: interactive ? 'pointer' : 'default',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
