import { useEffect, useMemo, useState } from 'react'

/**
 * Splits a multiline grid string into a 2D array of single-char cells.
 * Leading/trailing blank lines are trimmed so templates can use backtick
 * strings with newlines for readability.
 */
function parseGrid(str) {
  return String(str)
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
    .split('\n')
    .map((row) => row.split(''))
}

/**
 * PixelSprite — the core LCD pixel-art renderer for Slopagotchi.
 * Renders one or more ASCII "grid" frames as crisp pixel cells, optionally
 * cycling through frames for animation. Every creature and pixel icon in the
 * system is drawn this way.
 *
 * Chars in `ink` are "on" (filled with `color`); everything else is the
 * `background` (transparent by default so the LCD screen shows through).
 */
export default function PixelSprite({
  grid,
  frames,
  fps = 2,
  scale = 6,
  color = 'var(--lcd-ink)',
  background = 'transparent',
  ink = '#X',
  className = '',
  style = {},
  ...rest
}) {
  const frameList = useMemo(() => {
    const src = frames && frames.length ? frames : [grid]
    return src.filter(Boolean).map(parseGrid)
  }, [frames, grid])

  const [idx, setIdx] = useState(0)
  useEffect(() => {
    setIdx(0)
    if (frameList.length < 2) return undefined
    const id = setInterval(
      () => setIdx((p) => (p + 1) % frameList.length),
      Math.max(60, 1000 / fps)
    )
    return () => clearInterval(id)
  }, [frameList, fps])

  const cells = frameList[Math.min(idx, frameList.length - 1)] || []
  const rows = cells.length
  const cols = cells.reduce((m, r) => Math.max(m, r.length), 0)
  const onChars = new Set(String(ink).split(''))

  return (
    <div
      className={`pixelated ${className}`}
      role="img"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${scale}px)`,
        gridTemplateRows: `repeat(${rows}, ${scale}px)`,
        background,
        lineHeight: 0,
        ...style,
      }}
      {...rest}
    >
      {cells.flatMap((row, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const on = onChars.has(row[c] || '.')
          return (
            <span
              key={`${r}-${c}`}
              style={{ width: scale, height: scale, background: on ? color : 'transparent' }}
            />
          )
        })
      )}
    </div>
  )
}
