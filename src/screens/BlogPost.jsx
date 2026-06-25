import { Link, Navigate, useParams } from 'react-router-dom'
import { Button } from '../ds/index.js'
import MarketingHeader from '../components/MarketingHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { POSTS_BY_DATE, formatDate, getPost } from '../content/posts.js'

/** Renders the typed content blocks of a post body. */
function PostBody({ blocks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return (
            <h2 key={i} className="pixel-display" style={{ fontSize: 'clamp(19px, 2.4vw, 24px)', margin: '12px 0 0' }}>
              {b.text}
            </h2>
          )
        }
        if (b.type === 'quote') {
          return (
            <blockquote
              key={i}
              style={{
                margin: 0,
                padding: '18px 24px',
                borderLeft: '4px solid var(--accent)',
                background: 'var(--accent-soft)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                fontFamily: 'var(--font-lcd)',
                fontSize: 20,
                lineHeight: 1.45,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              {b.text}
            </blockquote>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {b.items.map((item, j) => (
                <li key={j} style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', fontWeight: 600 }}>
                  {item}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', fontWeight: 500, margin: 0 }}>
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)
  if (!post) return <Navigate to="/blog" replace />

  const idx = POSTS_BY_DATE.findIndex((p) => p.slug === slug)
  const next = POSTS_BY_DATE[idx + 1] || POSTS_BY_DATE[0]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader />

      <main className="container-narrow" style={{ flex: 1, padding: '48px 24px 72px' }}>
        <Link to="/blog" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-3)' }}>
          ← All posts
        </Link>

        <article style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {post.tags.map((t) => (
              <span
                key={t}
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
                {t}
              </span>
            ))}
          </div>

          <h1 className="pixel-display" style={{ fontSize: 'clamp(26px, 4vw, 40px)', margin: 0 }}>
            {post.title}
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 20,
              paddingBottom: 24,
              borderBottom: '1px solid var(--line)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--accent)',
                backgroundImage: 'var(--gloss-radial)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontFamily: 'var(--font-pixel)',
                fontSize: 12,
              }}
            >
              {post.author.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <span style={{ color: 'var(--ink-2)' }}>
                {post.author}
                {post.role ? <span style={{ color: 'var(--ink-3)' }}> · {post.role}</span> : null}
              </span>
              <span>
                {formatDate(post.date)} · {post.readingTime} read
              </span>
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <PostBody blocks={post.body} />
          </div>
        </article>

        {/* CTA */}
        <div
          style={{
            marginTop: 48,
            padding: '32px 28px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--accent-soft)',
            border: '1px solid #f6c6dc',
            textAlign: 'center',
          }}
        >
          <h3 className="pixel-display" style={{ fontSize: 20, margin: 0 }}>
            cut the slop at the source.
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: '12px auto 22px', maxWidth: 460 }}>
            Hatch a pet that lives off your clean code and flinches at AI slop. $20 per seat / month,
            self-serve, cancel anytime.
          </p>
          <Link to="/hatch">
            <Button size="lg" pixel={false}>
              Hatch your egg
            </Button>
          </Link>
        </div>

        {/* Next up */}
        <div style={{ marginTop: 40 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>
            Read next
          </div>
          <Link
            to={`/blog/${next.slug}`}
            style={{
              display: 'block',
              padding: '20px 24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--line)',
              background: 'var(--surface-card)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}>
              {formatDate(next.date)} · {next.readingTime}
            </div>
            <div className="pixel-display" style={{ fontSize: 17, lineHeight: 1.35 }}>
              {next.title}
            </div>
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
