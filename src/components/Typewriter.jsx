import { useEffect, useRef, useState } from 'react'

/**
 * Typewriter — types `text` out one character at a time on mount. The untyped
 * remainder is kept in the DOM but hidden, so the element reserves its final
 * size from the first frame (no layout reflow as it types). `delay` staggers the
 * start; `speed` is ms per character. Honors prefers-reduced-motion.
 */
export default function Typewriter({ text, speed = 26, delay = 0, as: Tag = 'span', style = {}, ...rest }) {
  const [n, setN] = useState(0)
  const timers = useRef([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length)
      return undefined
    }
    setN(0)
    const start = setTimeout(function tick(i) {
      setN(i)
      if (i < text.length) timers.current.push(setTimeout(() => tick(i + 1), speed))
    }, delay, 1)
    timers.current.push(start)
    return () => timers.current.forEach(clearTimeout)
  }, [text, speed, delay])

  return (
    <Tag style={style} {...rest}>
      {text.slice(0, n)}
      <span aria-hidden style={{ visibility: 'hidden' }}>{text.slice(n)}</span>
    </Tag>
  )
}
