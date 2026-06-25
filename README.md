# Slopagotchi 🥚

**A Tamagotchi for the age of AI.** A clingy little pet that **thrives on your best
work** — and rots into a puddle of slop the moment you ship the lazy stuff. Its
health *is* your live slop score: real, read-it-yourself work feeds it; careless
AI slop makes it wilt. Cute, clingy, and relentlessly passive-aggressive.

> We're **anti-slop, not anti-AI.** Quality in, slop out.

Built on [Tangled](https://tangled.org) and native to the **AT Protocol** — your
slop-score history is published as public, portable records you own. The firehose
scores every push in real time; your whole team's pets sit in one zoo, ranked by
slop shipped. Impossible to fake.

Visually it's the **Slopagotchi Design System**: olive LCD + candy-plastic shell,
bubblegum-pink accent, the brand's three fonts (Press Start 2P / Pixelify Sans /
Nunito), and pixel-art creatures — never emoji.

## The bet

- **Slop is the waste line on every AI budget.** Most of what AI generates is slop
  that still gets stored, indexed, and re-trained on — forever. Cut it at the
  source and you reclaim capacity instead of racing to add more.
- **The score is the moat.** Saved on the AT Protocol, a developer's slop-score
  progress is public, portable, and theirs to own — not locked in our database.
- **Health can't be gamed.** It's derived from real pull requests anyone can read,
  not self-reported.

**Traction:** ~$10K ARR, self-serve, paying customers — no sales calls. Built at
**Junction · Sunstead Hack** (Tools for Builders on Tangled). In good company with
Skyfall Ventures, Vaskeladden, Carve, Featherless AI, SSE Business Lab, Kiuas, KTH,
the KTH AI Society, Tendermore, and Mia Matchmaking.

## What's in here

A complete, interactive single-page app — not mocks. The product (hatch / play /
zoo) sits behind **Clerk** sign-in and a **Stripe** subscription; the marketing
pages and the public scoreboard are open.

**Open**

- **Landing** (`/`) — one-screen pitch with a live hero device that cycles the
  whole roster, the care mechanic, and the full mood ladder (thriving → expired)
  rendered with real animated `PetScene` environments.
- **Blog** (`/blog`, `/blog/:slug`) and **Legal** (`/terms`, `/privacy`,
  `/refunds`) — the marketing surface.
- **Scoreboard** (`/scoreboard`) — every developer on the Slopagotchi AT record,
  ranked by **pet health weighted by how many PRs they've shipped** (so a developer
  with no scored code can't top the board). Read straight from the public
  `app.slopgotchi.pet.state` records; degrades to an empty state if the backend
  isn't wired.

**Behind auth + paywall**

- **Hatch** (`/hatch`) — connect your sources → pick one of 11 creatures → choose a
  shell colour (which retints the whole app) → name it.
- **My Pet** (`/play`) — the egg device you actually play. Feed it real commits,
  praise it, clean its slop, or give in and **ship AI slop** and watch it wilt.
  Live vitals, a slop tally, and a slop receipt of your **real scored PRs**
  (`PRs scored` + recent incidents) once a handle is connected.
- **The Zoo** (`/zoo`) — your **personal roster** of developers, ranked by current
  slop. Add anyone by **GitHub username or Tangled handle**; their pet is scored
  from their real pull requests, and each tile shows the same mood-driven scene as
  My Pet (thermometer when sick, hospital rig when critical, the gallows when it's
  over). Tap a pet to inspect *why* it scored.

### The simulation

`src/game/engine.js` is a small real-time pet sim (pure functions) that drives the
local toy and the visuals:

- **Vitals** — `health`, `hunger`, `slop` (0–100 internally), drifting in real
  time. Hunger drains; slop dissipates slowly; health falls when the pet is
  starving or slop-poisoned, and recovers when it's fed and clean. Offline time is
  integrated on load (capped at 12h) so the pet keeps living while the tab is shut.
- **Mood** is derived from the vitals — `thriving / happy / ok / hangry / sick /
  critical / dead` — and drives the creature's expression and its on-screen world
  (sparkles, a food bowl, a thermometer, a full hospital rig, the gallows).
- **Actions** feed / praise / clean / shipSlop / revive, plus a slop-free streak,
  XP / levels, and a day rollover.
- State persists to `localStorage`; the pet's shell colour themes the app accent.

## The real backend (scoring pipeline)

The local sim is the toy. The **real** Slopagotchi scores your actual Tangled pull
requests and GitHub PRs for *slop* — careless overbuild, weak tests, scope sprawl —
using an open model on Featherless, and publishes the score and a receipt as public
ATProto records. That whole pipeline ships in this repo as **Vercel serverless
functions** alongside the Vite SPA.

```
api/                         thin Vercel function adapters (VercelRequest/Response)
  join.ts                    POST  /api/join              register + start backfill
  status/[handle].ts         GET   /api/status/:handle    join/backfill progress
  cron/poll.ts               GET   /api/cron/poll         secured re-score (cron)
  zoo/[team].ts              GET   /api/zoo/:team          a team's scored pets (JSON)
  pet/[handle].ts            GET   /api/pet/:handle        one pet + slop receipt (JSON)
  scoreboard.ts              GET   /api/scoreboard         every dev on the AT record, ranked
  github/standalone.ts       POST  /api/github/standalone  score a public GitHub user (no account)
  github/link.ts             POST  /api/github/link        prove + link a GitHub user to a DID
  checkout.js                POST  /api/checkout           create a Stripe Checkout session
  confirm.js                 POST  /api/confirm            verify payment, flip the subscribed flag
  _lib.js                    shared Clerk/Stripe helpers for the billing routes
lib/                         framework-agnostic logic (fully unit-tested)
  api/                       pure core handlers → { status, body }
  atproto/                   handle→DID→PDS resolve, read pulls, read/write records
  github/                    REST client, no-OAuth ownership proof, PR read layer
  scorer/                    diff prep → Featherless → parse/validate (Zod)
  pipeline.ts · health.ts · receipt.ts · store.ts (Upstash Redis)
```

Each route's logic lives as a pure, testable core in `lib/api/*`; the `/api`
adapters only translate the HTTP envelope and run background work via
`@vercel/functions` `waitUntil`. The frontend talks to these through
`src/api/client.js` (soft-failing fetch) and `src/api/mapping.js` (health band →
creature mood). If the backend env isn't wired, every endpoint degrades gracefully
and the UI stays on its local simulation.

### How the two halves connect

- **Onboarding** collects a Tangled handle + team and calls `POST /api/join`, or a
  GitHub username and calls `POST /api/github/standalone`.
- **The Zoo** builds a personal roster and loads `GET /api/pet/:handle` (or
  `github:<login>`) per developer, rendering real, scored pets.
- **My Pet** shows a live **slop receipt** and PR-backed vitals from
  `GET /api/pet/:handle`.
- **The Scoreboard** loads `GET /api/scoreboard` — every published pet-state record,
  ranked by PR-weighted health.

### Health, scored from real PRs

`computeHealth()` is a decay-weighted average of a developer's recent per-PR slop
scores: `health = clamp(0, 100, round(100 − weightedSlop))`, newest rounds weighted
most. A developer with no scored PRs is the distinct "no diagnoses yet" state
(health 100, no band) — which is why the scoreboard ranks on a **PR-count-weighted**
score, shrinking unproven pets toward a neutral baseline so they can't sit at the
top on an empty record.

### GitHub PRs (not just Tangled)

Scoring is **source-agnostic**: the same pipeline scores Tangled pull rounds and
GitHub PRs, and publishes the same `app.slopgotchi.*` records (tagged with their
`source`). Two ways in:

- **Standalone** (the low-friction default) — `POST /api/github/standalone`
  `{ githubUsername }`. No atproto account, no proof: the data is public and the
  subject *is* the GitHub identity, so the pet is keyed to `github:<login>`.
  Set `GITHUB_TOKEN` to enable; without it the route 503s and the cron skips
  GitHub. The pet + receipt are then served by `GET /api/pet/github:<login>`.
- **Linked** (optional upgrade) — `POST /api/github/link` `{ handle|did,
  githubUsername }`. A no-OAuth ownership proof (your handle/DID in your GitHub bio
  or a public `slopgotchi-verify.md` gist) links the username to your DID under
  first-prover-wins, so GitHub PRs feed the *same* pet as your Tangled pulls.
  Linking is unify-going-forward: the username drops out of the standalone poll set
  and new scores accrue under the DID.

The daily cron drains Tangled and GitHub on **separate round budgets** so neither
source starves the other.

### Auth & billing

Authentication is **Clerk**; billing is **direct Stripe Checkout** (no Clerk
Billing). The `/hatch`, `/play`, and `/zoo` routes are gated behind sign-in plus an
active subscription. `POST /api/checkout` starts a Checkout session; on return,
`POST /api/confirm` verifies the payment server-side and sets a `subscribed` flag on
the Clerk user — so it persists across devices and can't be flipped from the client.

### Environment

The Vite frontend needs the **Clerk publishable key** (and the billing routes need
Clerk/Stripe secrets); the scoring backend needs Upstash Redis, Featherless, an
ATProto service account, and a `CRON_SECRET`. All of it is documented in
`.env.example` — copy it to `.env` (gitignored) or add the vars to the Vercel
project (`.env.local` for `vercel dev`). Tests run without any of them — unit tests
mock, integration tests skip.

## Run it

```bash
npm install
npm run dev       # Vite only (frontend) → http://localhost:5273
npm run dev:full  # vercel dev → frontend + /api functions together
```

```bash
npm test          # vitest (frontend + backend) — 239 passing (integration tests skip without env)
npm run typecheck # tsc --noEmit over lib/ + api/
npm run build     # production build → dist/
npm run preview   # serve the build
```

### Deploy

Push to Vercel (framework: **Vite**, set in `vercel.json`). The SPA builds to
`dist/`; `/api/*` deploys as Node serverless functions automatically. Set the
frontend + backend env vars in the dashboard, then provision Redis with
`vercel integration add upstash/upstash-kv`. `vercel.json` ships a once-daily cron
hitting `/api/cron/poll` (Hobby-safe); Vercel Cron sends the `CRON_SECRET` bearer
automatically. For per-minute polling on Pro, change the `crons` schedule to
`* * * * *`. Idempotency on `(PR, round)` makes repeated invocations safe.

## Project layout

```
src/
  ds/         the design system, ported to clean React modules
              (PixelSprite, Pet + PetScene, PixelIcon, Button, Card,
               StatMeter, StatusBadge, LcdScreen, DeviceShell, Logo)
  api/        client.js (fetch the /api functions) · mapping.js (health → mood)
  game/       engine.js · store.jsx · quips.js · zoo.js  (the sim + voice + data)
  screens/    Landing · Blog · BlogPost · Legal · AuthScreen · Paywall ·
              Onboarding · Personal · Zoo · Scoreboard
  components/ TopBar · PetConsole · VitalsPanel · ZooCard · ReceiptPanel ·
              PetInspector · Typewriter · MarketingHeader · SiteFooter ·
              CaseStudies · PaymentBadges
  content/    posts.js (blog) · legal.js (terms/privacy/refunds)
  styles/     tokens.css (design tokens) · global.css (motion) · screens.css (layout)
api/          Vercel serverless functions (scoring + billing HTTP surface)
lib/          framework-agnostic backend logic + its unit tests
```

The design-system components and tokens are reconstructed faithfully from the
Slopagotchi DS bundle; the creatures, icons, voice, and animated states all come
straight from the kit.
