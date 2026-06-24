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
  your own pet spliced in and highlighted.

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

## Run it

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
  game/      engine.js · store.jsx · quips.js · zoo.js  (the sim + voice + data)
  screens/   Landing · Onboarding · Personal · Zoo
  components/ TopBar · PetConsole · VitalsPanel · ZooCard
  styles/    tokens.css (design tokens) · global.css (motion) · screens.css (layout)
```

The design-system components and tokens are reconstructed faithfully from the
Slopagotchi DS bundle; the creatures, icons, voice, and animated states all come
straight from the kit.
