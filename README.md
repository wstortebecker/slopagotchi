# Slopagotchi 🥚

A Tamagotchi-style virtual pet that **lives off your clean code** — and slowly turns
into a puddle as you ship AI slop. Cute, clingy, and relentlessly passive-aggressive.

Built end-to-end on the **Slopagotchi Design System**: olive LCD + candy-plastic
shell, bubblegum-pink accent, and the brand's three fonts (Press Start 2P / Pixelify
Sans / Nunito). Pixel-art creatures, never emoji.

## What's in here

A complete, interactive single-page app — not mocks:

- **Landing** (`/`) — one-screen pitch with a live hero device that cycles the whole
  roster, the care mechanic, and the full mood ladder (thriving → expired) rendered
  with real animated `PetScene` environments.
- **Hatch** (`/hatch`) — a four-step flow: connect your sources → pick one of 11
  creatures → choose a shell colour (which retints the whole app) → name it.
- **My Pet** (`/play`) — the egg device you actually play. Feed it real commits,
  praise it, clean its slop, or give in and **ship AI slop** and watch it wilt.
  Live vitals, a slop tally, and a rolling incident log.
- **The Zoo** (`/zoo`) — every pet on the team, ranked by slop shipped today, with
  your own pet spliced in and highlighted. When you've connected a real Tangled
  account, this shows your **actual team zoo** scored from real pull requests;
  otherwise it falls back to the demo roster.

### The simulation

`src/game/engine.js` is a small real-time pet sim (pure functions):

- **Vitals** — `health`, `hunger`, `slop` (0–100 internally), drifting in real time.
  Hunger drains; slop dissipates slowly; health falls when the pet is starving or
  slop-poisoned, and recovers when it's fed and clean. Offline time is integrated on
  load (capped at 12h) so the pet keeps living while the tab is closed.
- **Mood** is derived from the vitals — `thriving / happy / ok / hangry / sick /
  critical / dead` — and drives the creature's expression and its on-screen world
  (sparkles, a food bowl, a thermometer, a full hospital rig, the gallows).
- **Actions** feed / praise / clean / shipSlop / revive, plus a slop-free streak,
  XP / levels, and a day rollover.
- State persists to `localStorage`; the pet's shell colour themes the app accent.

## The real backend (scoring pipeline)

The local sim is the toy. The **real** Slopagotchi scores your actual
[Tangled](https://tangled.org) pull requests for *slop* — careless overbuild, weak
tests, scope sprawl — using an open model on Featherless, and publishes the score
and a receipt as public ATProto records. That whole pipeline now ships in this repo
as **Vercel serverless functions** alongside the Vite SPA.

```
api/                         thin Vercel function adapters (VercelRequest/Response)
  join.ts                    POST  /api/join            register + start backfill
  status/[handle].ts         GET   /api/status/:handle  join/backfill progress
  cron/poll.ts               GET   /api/cron/poll        secured re-score (cron)
  zoo/[team].ts              GET   /api/zoo/:team        a team's scored pets (JSON)
  pet/[handle].ts            GET   /api/pet/:handle      one pet + slop receipt (JSON)
lib/                         framework-agnostic logic (fully unit-tested)
  api/                       pure core handlers → { status, body }
  atproto/                   handle→DID→PDS resolve, read pulls, write records
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

- **Onboarding** collects a Tangled handle + team and calls `POST /api/join`.
- **The Zoo** loads `GET /api/zoo/:team` and renders real, scored pets.
- **The play screen** shows a live **slop receipt** from `GET /api/pet/:handle`.

### Environment

The Vite frontend needs **no** env. The `/api` functions need the vars in
`.env.example` (Upstash Redis, Featherless, an ATProto service account, a
`CRON_SECRET`). Add them to the Vercel project (or `.env.local` for `vercel dev`).
Tests run without any of them — unit tests mock, integration tests skip.

## Run it

```bash
npm install
npm run dev       # Vite only (frontend) → http://localhost:5273
npm run dev:full  # vercel dev → frontend + /api functions together
```

```bash
npm test          # vitest (frontend + backend), 138 tests
npm run typecheck # tsc --noEmit over lib/ + api/
npm run build     # production build → dist/
npm run preview   # serve the build
```

### Deploy

Push to Vercel (framework: **Vite**, set in `vercel.json`). The SPA builds to
`dist/`; `/api/*` deploys as Node serverless functions automatically. Set the
backend env vars in the dashboard, then provision Redis with
`vercel integration add upstash/upstash-kv`. `vercel.json` ships a once-daily cron
hitting `/api/cron/poll` (Hobby-safe); Vercel Cron sends the `CRON_SECRET` bearer
automatically. For per-minute polling on Pro, change the `crons` schedule to
`* * * * *`. Idempotency on `(PR, round)` makes repeated invocations safe.

```bash
npm install
npm run dev      # http://localhost:5273
```

```bash
npm run build    # production build → dist/
npm run preview  # serve the build
```

## Project layout

```
src/
  ds/        the design system, ported to clean React modules
             (PixelSprite, Pet + PetScene, PixelIcon, Button, Card,
              StatMeter, StatusBadge, LcdScreen, DeviceShell, Logo)
  api/       client.js (fetch the /api functions) · mapping.js (health → mood)
  game/      engine.js · store.jsx · quips.js · zoo.js  (the sim + voice + data)
  screens/   Landing · Onboarding · Personal · Zoo
  components/ TopBar · PetConsole · VitalsPanel · ZooCard · ReceiptPanel
  styles/    tokens.css (design tokens) · global.css (motion) · screens.css (layout)
api/         Vercel serverless functions (the backend HTTP surface)
lib/         framework-agnostic backend logic + its unit tests
```

The design-system components and tokens are reconstructed faithfully from the
Slopagotchi DS bundle; the creatures, icons, voice, and animated states all come
straight from the kit.
