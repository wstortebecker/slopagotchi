import PixelSprite from './PixelSprite.jsx'
import { MOOD_MOTION, PROPS, SPECIES, SPECIES_LIST, framesFor } from './sprites.js'

export { SPECIES, SPECIES_LIST }

/**
 * Pet — a Slopagotchi creature (the creature only; for the full animated
 * environment use PetScene). `species` picks which one (blip is the standard
 * mascot); `mood` drives its expression, set by how much AI slop its owner
 * ships. Renders pixel frames on a transparent background; drop onto an
 * LcdScreen. Animates (blink + bob/sway) unless `animate` is false.
 */
export default function Pet({
  species = 'blip',
  mood = 'happy',
  scale = 8,
  animate = true,
  color,
  className = '',
  style = {},
  ...rest
}) {
  const motion = MOOD_MOTION[mood] || MOOD_MOTION.happy
  const allFrames = framesFor(species, mood)
  const frames = animate ? allFrames : [allFrames[0]]
  const moodAnim =
    animate && motion.anim
      ? `${motion.anim} ${motion.anim === 'slop-breathe' ? '1.1s' : '1.6s'} ease-in-out infinite`
      : 'none'

  return (
    <div
      className={`slop-anim ${className}`}
      style={{ display: 'inline-block', animation: moodAnim, transformOrigin: 'center bottom', ...style }}
      {...rest}
    >
      <PixelSprite
        frames={frames}
        fps={motion.fps}
        scale={scale}
        color={color || (mood === 'dead' ? 'var(--lcd-ink-soft)' : 'var(--lcd-ink)')}
      />
    </div>
  )
}

const INK = 'var(--lcd-ink)'
const SOFT = 'var(--lcd-ink-soft)'

function Pos({ children, style }) {
  return <div style={{ position: 'absolute', ...style }}>{children}</div>
}

/**
 * PetScene — the creature plus its world. Fills a position:relative parent
 * (give it 100% width/height inside an LcdScreen with `fill`). Each mood adds
 * the storytelling props: sparkles when thriving, a bowl + fork when hangry, a
 * thermometer when sick, a full hospital rig when critical, and the gallows
 * when it's over.
 */
export function PetScene({ species = 'blip', mood = 'happy', scale = 8 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {mood === 'thriving' && <Thriving species={species} scale={scale} />}
      {(mood === 'happy' || mood === 'ok') && <Calm species={species} mood={mood} scale={scale} />}
      {mood === 'hangry' && <Hangry species={species} scale={scale} />}
      {mood === 'sick' && <Sick species={species} scale={scale} />}
      {mood === 'critical' && <Critical species={species} scale={scale} />}
      {mood === 'dead' && <Dead species={species} scale={scale} />}
    </div>
  )
}

function Centered({ children, style }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'grid',
        placeItems: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Calm({ species, mood, scale }) {
  return (
    <Centered>
      <Pet species={species} mood={mood} scale={scale} />
    </Centered>
  )
}

function Thriving({ species, scale }) {
  const sparks = [
    { x: 24, y: 18, d: 0 },
    { x: 72, y: 26, d: 0.7 },
    { x: 38, y: 76, d: 1.2 },
  ]
  return (
    <>
      <Centered>
        <Pet species={species} mood="thriving" scale={scale} />
      </Centered>
      {sparks.map((s, i) => (
        <Pos
          key={i}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animation: `slop-twinkle 1.4s ease-in-out ${s.d}s infinite`,
          }}
        >
          <PixelSprite grid={PROPS.spark} scale={scale * 0.55} color={INK} />
        </Pos>
      ))}
    </>
  )
}

function Hangry({ species, scale }) {
  return (
    <>
      <Pos style={{ left: '44%', top: '46%', transform: 'translate(-50%, -50%)' }}>
        <Pet species={species} mood="hangry" scale={scale} />
      </Pos>
      <Pos style={{ left: '40%', top: '78%', transform: 'translateX(-50%)' }}>
        <PixelSprite grid={PROPS.bowl} scale={scale * 0.7} color={INK} />
      </Pos>
      <Pos style={{ right: '14%', top: '48%' }}>
        <PixelSprite grid={PROPS.fork} scale={scale * 0.55} color={INK} />
      </Pos>
    </>
  )
}

function Sick({ species, scale }) {
  return (
    <>
      <Pos style={{ left: '48%', top: '52%', transform: 'translate(-50%, -50%)' }}>
        <Pet species={species} mood="sick" scale={scale} />
      </Pos>
      {/* thermometer in mouth — hollow tube + mercury + round bulb */}
      <Pos style={{ left: '56%', top: '52%', transform: 'rotate(34deg)', transformOrigin: 'top center' }}>
        <div
          style={{
            position: 'relative',
            width: 7,
            height: 22,
            border: '2px solid var(--lcd-ink)',
            borderRadius: 3,
            background: 'var(--lcd-screen)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 1,
              right: 1,
              bottom: 1,
              height: 10,
              background: 'var(--lcd-ink)',
              borderRadius: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -2,
              bottom: -6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--lcd-ink)',
            }}
          />
        </div>
      </Pos>
    </>
  )
}

function Critical({ species, scale }) {
  const bar = { background: 'var(--lcd-ink)' }
  const outline = { border: '2px solid var(--lcd-ink)' }
  return (
    <>
      {/* hospital bed */}
      <Pos style={{ left: '50%', top: '70%', transform: 'translateX(-50%)', width: '64%', height: 14, borderRadius: 3, ...outline }} />
      <Pos style={{ left: '20%', top: '61%', width: 20, height: 11, borderRadius: 4, ...outline }} />
      {[30, 68].map((x) => (
        <Pos key={x} style={{ left: `${x}%`, top: '79%', width: 2, height: 11, ...bar }} />
      ))}
      {/* pet reclined on the bed */}
      <Pos style={{ left: '45%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <Pet species={species} mood="critical" scale={scale * 0.85} />
      </Pos>
      {/* oxygen mask */}
      <Pos style={{ left: '45%', top: '56%', transform: 'translateX(-50%)', width: 26, height: 14, borderRadius: 7, ...outline }} />
      {/* IV pole + bag + drip line */}
      <Pos style={{ left: '12%', top: '14%', width: 2, height: '54%', ...bar }} />
      <Pos style={{ left: '8%', top: '16%', width: 13, height: 17, borderRadius: '0 0 5px 5px', ...outline }} />
      <Pos style={{ left: '13%', top: '50%', width: 28, height: 2, ...bar }} />
      {/* heart monitor with scrolling EKG */}
      <Pos style={{ right: '6%', top: '11%', width: 66, height: 32, borderRadius: 4, overflow: 'hidden', ...outline }}>
        <div style={{ width: '200%', height: '100%', display: 'flex', animation: 'slop-scrollx 1.1s linear infinite' }}>
          <PixelSprite grid={PROPS.ekg} scale={2.0} color={INK} />
          <PixelSprite grid={PROPS.ekg} scale={2.0} color={INK} />
        </div>
      </Pos>
    </>
  )
}

function Dead({ species, scale }) {
  return (
    <>
      {/* gallows beam */}
      <Pos style={{ left: '50%', top: '8%', transform: 'translateX(-50%)', width: '60%', height: 4, background: 'var(--lcd-ink)' }} />
      {/* swinging rope + pet, pivot at the beam */}
      <Pos
        style={{
          left: '50%',
          top: '8%',
          transform: 'translateX(-50%)',
          transformOrigin: 'top center',
          animation: 'slop-swing 2.6s ease-in-out infinite',
        }}
      >
        <div style={{ width: 3, height: 30, background: 'var(--lcd-ink)', margin: '0 auto' }} />
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <PixelSprite frames={framesFor(species, 'dead')} fps={1} scale={scale} color={SOFT} />
        </div>
      </Pos>
    </>
  )
}
