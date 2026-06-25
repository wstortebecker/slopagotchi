import { Link } from 'react-router-dom'
import { Card, PixelIcon } from '../ds/index.js'
import MarketingHeader from '../components/MarketingHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { POSTS_BY_DATE, formatDate } from '../content/posts.js'

function Tag({ children }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 'var(--tracking-caps)',
        textTransform: 'uppercase',
        color: 'var(--accent-press)',
        background: 'var(--accent-soft)',
        padding: '3px 9px',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {children}
    </span>
  )
}

function PostCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} style={{ display: 'block' }}>
      <Card interactive padding={24} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {post.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <h2 className="pixel-display" style={{ fontSize: 18, lineHeight: 1.35, margin: 0 }}>
          {post.title}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: 0, flex: 1 }}>
          {post.excerpt}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>
          <span>{post.author}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(post.date)}</span>
          <span aria-hidden>·</span>
          <span>{post.readingTime}</span>
        </div>
      </Card>
    </Link>
  )
}

export default function Blog() {
  const [featured, ...rest] = POSTS_BY_DATE

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader />

      <main className="container" style={{ flex: 1, padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-soft)',
              color: 'var(--accent-press)',
              fontWeight: 800,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            <PixelIcon name="sprout" scale={2.5} color="var(--accent-press)" />
            the slopagotchi blog
          </div>
          <h1 className="pixel-display" style={{ fontSize: 'clamp(26px, 3.6vw, 40px)', margin: 0 }}>
            field notes on <span style={{ color: 'var(--accent)' }}>slop</span>, taste &amp; trust.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: '18px 0 0' }}>
            Why production went free, why the capacity crunch is self-inflicted, and why knowing what
            to keep is the only skill that still scales.
          </p>
        </div>

        {/* Featured */}
        <Link to={`/blog/${featured.slug}`} style={{ display: 'block', marginBottom: 32 }}>
          <Card interactive tone="ink" padding={32}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {featured.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 'var(--tracking-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--paper)',
                    background: 'rgba(255,255,255,0.14)',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="pixel-display" style={{ fontSize: 'clamp(20px, 2.6vw, 28px)', lineHeight: 1.35, margin: 0, color: 'var(--paper)' }}>
              {featured.title}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(251,250,242,0.78)', fontWeight: 600, margin: '16px 0 0', maxWidth: 720 }}>
              {featured.excerpt}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'rgba(251,250,242,0.66)', marginTop: 18 }}>
              <span>{featured.author}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(featured.date)}</span>
              <span aria-hidden>·</span>
              <span>{featured.readingTime}</span>
            </div>
          </Card>
        </Link>

        <div className="features-grid">
          {rest.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
