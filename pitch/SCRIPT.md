# Slopagotchi — 4-minute pitch script

> **The one rule:** we're **anti-slop, not anti-AI.** Use all the AI you want — just read it before
> you ship it. It's about **quality vs. slop**, across *all* AI knowledge work (code, docs, decks,
> emails), not just code. Never let it read as "AI bad."
>
> **Voice:** warm, dry, fast. When the *pet* talks, deadpan and slightly hurt. When *you* talk,
> confident founder. Demo first, slides barely.

Open the deck: `.context/pitch/PITCH.html` (double-click → **F** fullscreen · **← →** to move).

---

## The arc — 11 slides, ~4:00

| # | Slide | ~Time | The beat |
|---|-------|------|----------|
| 1 | title | 0:10 | a pet that thrives on good work, rots on slop |
| 2 | **the customer wall** | 0:15 | **$10K ARR, self-serve** + 9 logos |
| 3 | meet your pet | 0:15 | it eats quality — AI-made or not |
| 4 | the mechanic | 0:12 | quality vs. slop = its health |
| 5 | the zoo | 0:15 | whole team, names above pets, ranked by slop |
| 6 | **LIVE: someone in the room** | 0:55 | pull up a volunteer's real pet → feed → ship slop |
| 7 | **the bet** | 0:30 | *no data centers in space* — SpaceX & Starcloud, crossed out |
| 8 | it's everyone | 0:18 | knowledge-work, not code (Vaskeladden) |
| 9 | why now · the moat | 0:20 | web of trust on AT Protocol |
| 10 | business | 0:12 | one plan, $20/seat, swipe a card |
| 11 | close | 0:10 | pet voice + why we win |

---

## What to say

**1 · Title** — *"This is Slopagotchi. A virtual pet that thrives on your best work — and rots into a puddle of slop the moment you ship the lazy stuff. We're anti-slop, not anti-AI."*

**2 · The customer wall** — *"And it's already working: $10K ARR, fully self-serve. Nine teams pay to keep slop out of their work —"* (gesture at the wall) *"Skyfall, Vaskeladden, Carve, Featherless AI, SSE Business Lab, Kiuas, KTH AI Society, Tendermore, Mia Matchmaking. Here's what they're paying for."*

**3 · Meet your pet** — *"It hatches on your desk, it's cute, and it's judging you. It eats one thing: quality. AI-made or not — it can tell when you didn't even read it."* → pet: *"use the AI all you want. just read it before you ship it. i can taste a skim."*

**4 · The mechanic** — *"Ship quality, it thrives. Ship slop, it dies — in front of everyone. Its health IS your slop score. Live, and you can't fake it."*

**5 · The zoo** — *"This is the whole team — names above the pets, ranked by slop shipped today. Thriving on top. Bottom: here lies Hops, cause of death 'looks good to me.' Nobody wants to be the dead pet at the bottom while the team thrives."*

**6 · LIVE — someone in this room** *(the heart — switch to the running app)*
- *"Let's check on a real one — ______'s pet."* Pull up the **pre-arranged volunteer's** pet (see setup note below).
- *"I'll feed it something good."* → tap **Feed** 2–3×, vitals climb. *"See, it likes them again."*
- **The turn** → hit **Ship slop**. Slop spikes, health drains, world rots, incident stamps: *"api-gateway · 312 lines · 80% robot, 20% regret."* Let it roast: *"oh, you shipped that without reading it? bold."* Their pet just dropped a rank in the zoo.

**7 · The bet** *(slow down)* — *"Here's why this matters. The whole industry wants to build data centers in space to survive AI demand — SpaceX, Starcloud, a $1bn race. But the crunch is self-inflicted: most of what AI makes is slop that still gets stored, indexed and re-trained on, forever. Cut it at the source, reclaim ~80% of the capacity. Everyone else is racing to add capacity. We just stop shipping the garbage — and the whole space race becomes unnecessary."*

**8 · It's everyone** — *"Slop isn't a code problem, it's a knowledge-work problem. Junk code, unread docs, AI emails nobody asked for — free to make, paid for forever. Vaskeladden is a cleaning company — it runs its ops in git and already checks its writing for slop. Every company shipping AI through git is the market. That's everyone now."*

**9 · Why now · the moat** — *"Production went free in every medium at once, and nobody can see slop happening. We're the layer that can. We build it on Tangled and the AT Protocol: the firehose scores every push, your reputation is a portable record under your own identity, and trust compounds per person across orgs. That web of trust is the moat — it can't be cloned."*

**10 · Business** — *"One plan. $20 a seat. That's all we do. Swipe a card — no demo, no sales call. One person hatches a pet for the laugh, the whole org gets pulled into the zoo, the team puts it on a card. That's the funnel."*

**11 · Close** *(read the pet — callback to the open)* — *"here lies your pet. cause of death: 'looks good to me.' …now ship something worth keeping. i'm watching."* Then: *"Everyone else wants data centers in space. We just stopped shipping the slop — and made it a game. That's Slopagotchi — and it's already paying."*

---

## The live demo — make it bulletproof

**⚠ Two setup tasks before you present:**
1. **Pre-arrange the "someone in the room."** Have a willing person hatch a pet (and ideally connect their handle) *before* the talk, so slide 4's placeholder is a real name with a real pet on screen. Fall back to your own pet if needed — still frame it as "a real one." Fill the `______` on the slide with their name.
2. **Add a visible "Ship slop" button.** The repo has none — `shipSlop()` exists in `engine.js` / `store.jsx` but isn't wired to UI. Add a tempting button → `actions.shipSlop(312)` (fixed value = the deterministic "312 lines" incident). The turn depends on it; don't trigger it from the console live.

**Failsafes:**
- Run **locally** (`npm run dev`), not live Vercel — core loop is client-side, no network.
- **Hard-refresh + re-hatch** right before, so vitals start healthy (the sim decays in real time).
- **Record a 60s screen-capture** of the happy path and keep it in a tab. If a click misfires, cut to the video and keep talking.

---

## Q&A — the hard ones

**"Isn't this anti-AI / just shaming people for using AI?"** *"Opposite — use all the AI you want. We score the output, not the tool. The enemy is slop: stuff shipped without anyone reading it. The pet's the same whether a human or a model wrote it; it only reacts to whether it was worth keeping."*

**"Data centers in space — isn't that a stretch?"** *"It's the framing, not the invoice. The real, narrow claim: storage and retraining is the fastest-growing line on every AI budget, and a huge share of it is slop nobody reads. SpaceX and Starcloud are raising a billion dollars to add capacity. We remove the demand. Make the waste visible at creation and most of that race is unnecessary."*

**"Is the $10K ARR / are these customers real?"** *"Yes — self-serve, paying. Skyfall, Vaskeladden, Carve, SSE Business Lab, Kiuas. Happy to show the dashboard."* → *(Have it ready. Skyfall's a known Oslo VC and Kiuas/SSE are well-known Nordic hubs — if a judge knows them, lean in.)*

**"How is this really AT-Protocol-native?"** *"Three primitives: the firehose is the trigger, not polling. Your pet and slop score are a record under your DID — you own it, portable, not our database. The zoo is an AppView over those records. Portable per-identity reputation is exactly what makes the web-of-trust moat possible."*

**"How do you actually detect slop?"** *"Today it's a signal, not a verdict — patterns, agent trailers, diff-to-message ratios — behind one swappable `classify()` seam. Next version routes the artifact through a reviewer that posts its rationale back as a PR comment. The architecture doesn't change as the classifier gets smarter."*

**"$20 flat — why so simple / what about free?"** *"Self-serve clarity beats a pricing matrix. One plan, $20 a seat, swipe a card. The funnel is the zoo, not a sales team — one pet drags a whole org in."*

**"What stops GitHub / Linear cloning it?"** *"The moat isn't the pet — it's the portable reputation graph on an open protocol. Scores that compound per identity across orgs can't be replicated by a walled garden, because the record has to live with the user, not the platform."*

**"What's built vs. roadmap?"** → *(answer to your real deployment)* *"The product teams use is live and paid. What we're deepening on Tangled is the firehose + portable-reputation layer — and because the engine is already pure functions over a serializable record, that wiring is a small diff."*

---

## Delivery notes
- **Linger** on the live demo (slide 4) and **the bet** (slide 6). **Flash** title, mechanic, business.
- One number (**$10K ARR**), one laugh (**the slop turn**), one big idea (**no data centers in space**).
- Over time? Cut the feed beat and shorten business — **never** rush the slop turn or the bet.
- Frame for this crowd: it's the inversion of Tangled's own push-arms-race leaderboard, for the era that broke it. AI-forward, anti-slop.
