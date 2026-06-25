/**
 * PaymentBadges — a row of card-network marks rendered as little white plastic
 * "cards" so they sit on-brand next to the candy UI. Inline SVG, no image
 * requests, no dependency on a brand-icon font. Purely presentational trust
 * signalling for the footer / paywall.
 */

const CARD_W = 46
const CARD_H = 30

function CardFrame({ label, bg = '#ffffff', children }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        width: CARD_W,
        height: CARD_H,
        borderRadius: 6,
        background: bg,
        border: '1px solid var(--line)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      {children}
    </span>
  )
}

function Visa() {
  return (
    <CardFrame label="Visa">
      <svg width="34" height="18" viewBox="0 0 34 18" aria-hidden>
        <text
          x="17"
          y="14"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="700"
          fontStyle="italic"
          fontSize="14"
          letterSpacing="0.5"
          fill="#1A1F71"
        >
          VISA
        </text>
      </svg>
    </CardFrame>
  )
}

function Mastercard() {
  return (
    <CardFrame label="Mastercard">
      <svg width="36" height="22" viewBox="0 0 36 22" aria-hidden>
        <circle cx="14" cy="11" r="9" fill="#EB001B" />
        <circle cx="22" cy="11" r="9" fill="#F79E1B" />
        <path d="M18 4a9 9 0 0 0 0 14 9 9 0 0 0 0-14Z" fill="#FF5F00" />
      </svg>
    </CardFrame>
  )
}

function Amex() {
  return (
    <CardFrame label="American Express" bg="#1F72CD">
      <svg width="40" height="18" viewBox="0 0 40 18" aria-hidden>
        <text
          x="20"
          y="13"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="700"
          fontSize="9"
          letterSpacing="0.5"
          fill="#ffffff"
        >
          AMEX
        </text>
      </svg>
    </CardFrame>
  )
}

function Paypal() {
  return (
    <CardFrame label="PayPal">
      <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden>
        <text x="0" y="13" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontStyle="italic" fontSize="13" fill="#003087">
          Pay
        </text>
        <text x="22" y="13" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontStyle="italic" fontSize="13" fill="#009CDE">
          Pal
        </text>
      </svg>
    </CardFrame>
  )
}

function ApplePay() {
  return (
    <CardFrame label="Apple Pay">
      <svg width="42" height="18" viewBox="0 0 42 18" aria-hidden>
        {/* apple glyph */}
        <path
          d="M9.4 5.1c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.1.8.1 1.6-.4 2.1-1Zm.7 1.2c-1.2-.1-2.2.7-2.7.7-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.8 1.3 1.8 2.2 1.7.9 0 1.2-.6 2.3-.6 1.1 0 1.4.6 2.3.6.9 0 1.5-.8 2.1-1.7.7-1 .9-1.9.9-2-.1 0-1.8-.7-1.8-2.7 0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.2-2.6-1.3Z"
          fill="#111"
        />
        <text x="17" y="14" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="12" fill="#111">
          Pay
        </text>
      </svg>
    </CardFrame>
  )
}

function StripeMark() {
  return (
    <CardFrame label="Stripe" bg="#635BFF">
      <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden>
        <text
          x="20"
          y="13"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="800"
          fontSize="11"
          letterSpacing="0.3"
          fill="#ffffff"
        >
          stripe
        </text>
      </svg>
    </CardFrame>
  )
}

const BADGES = {
  visa: Visa,
  mastercard: Mastercard,
  amex: Amex,
  paypal: Paypal,
  applepay: ApplePay,
  stripe: StripeMark,
}

export default function PaymentBadges({
  items = ['visa', 'mastercard', 'amex', 'applepay', 'paypal', 'stripe'],
  gap = 8,
  style = {},
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap, alignItems: 'center', ...style }}>
      {items.map((key) => {
        const Badge = BADGES[key]
        return Badge ? <Badge key={key} /> : null
      })}
    </div>
  )
}
