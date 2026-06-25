import { Card, PixelIcon } from '../ds/index.js'

/**
 * Brand wordmark lockup — a glossy plastic monogram chip beside the company
 * wordmark, rendered in the brand's own colour. We don't ship third-party logo
 * files, so each customer is shown as a clean, on-brand text lockup instead.
 */
function BrandLockup({ monogram, word, suffix, color, wordFont = 'var(--font-body)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 40,
          height: 40,
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: color,
          backgroundImage: 'var(--gloss-radial)',
          boxShadow: 'var(--shadow-plastic-sm)',
          color: '#fff',
          fontFamily: 'var(--font-pixel)',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {monogram}
      </div>
      <span style={{ fontFamily: wordFont, fontWeight: 800, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        {word}
        {suffix && <span style={{ color }}>{suffix}</span>}
      </span>
    </div>
  )
}

/* Status pill — a metric or evaluation state for each case. */
function CasePill({ icon, label, color = 'var(--accent-press)', soft = 'var(--accent-soft)' }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 'var(--radius-pill)',
        background: soft,
        color,
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      <PixelIcon name={icon} scale={2.2} color={color} />
      {label}
    </div>
  )
}

const CASES = [
  {
    brand: { monogram: 'V', word: 'Vaskeladden', color: '#1f9d8f' },
    quote:
      'Slopagotchi keeps our whole team honest about shared knowledge — technical and non-technical alike. Whether someone ships code or a process doc, the pet only thrives when what we know is actually shared, not siloed.',
    person: 'Used to evaluate the whole team on shared knowledge',
    pill: { icon: 'heart', label: 'Code & knowledge in one health bar', color: '#15776c', soft: '#dcf3ef' },
  },
  {
    brand: { monogram: 'S', word: 'Skyfall', suffix: ' Ventures', color: '#2f3a52' },
    quote:
      "We're evaluating Slopagotchi as a first filter on inbound. A founding team's pet tells us in seconds whether they ship deliberate code or flood the repo with AI slop — a fast signal for triaging inbound deal flow.",
    person: 'Evaluating Slopagotchi to screen inbound cases',
    pill: { icon: 'star', label: 'Evaluating — inbound screening', color: '#2f3a52', soft: '#e6e9f0' },
  },
  {
    brand: { monogram: 'c', word: 'carve', suffix: '.ac', color: '#0f1115' },
    quote:
      'Since wiring Slopagotchi into our workflow we cut AI credit spend in half. Its passive-aggressive nudges stopped us from regenerating slop we would have thrown away anyway.',
    person: 'Cut AI credit usage with cleaner shipping',
    pill: { icon: 'bolt', label: '−50% AI credits', color: '#2fae57', soft: '#dcf3e3' },
  },
]

export default function CaseStudies() {
  return (
    <section className="container" style={{ padding: '8px 24px 96px' }}>
      <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
        <div className="section-label" style={{ marginBottom: 12 }}>
          Customer cases
        </div>
        <h2 className="pixel-display" style={{ fontSize: 'clamp(24px, 3.4vw, 38px)', margin: 0 }}>
          teams that ship <span style={{ color: 'var(--accent)' }}>less slop</span>
        </h2>
      </div>

      <div className="cases-grid">
        {CASES.map((c) => (
          <Card key={c.brand.word} interactive padding={28} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <BrandLockup {...c.brand} />
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', fontWeight: 600, flex: 1 }}>
              &ldquo;{c.quote}&rdquo;
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{c.person}</div>
              <CasePill {...c.pill} />
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
