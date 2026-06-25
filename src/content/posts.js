/**
 * Blog content — back-dated essays on the thesis behind Slopagotchi.
 *
 * Each post is plain data so the blog index and article view stay dumb. `body`
 * is an array of typed blocks ({ type, ... }) rendered by <PostBody/> in
 * screens/BlogPost.jsx — no markdown parser, no extra deps.
 *
 * Posts are authored newest-first; helpers below sort/look them up by date.
 */
export const POSTS = [
  {
    slug: 'production-went-free',
    title: 'Why now: production just went free in every medium at once',
    date: '2026-05-19',
    author: 'Simen Sandmo',
    role: 'Co-founder',
    readingTime: '6 min',
    tags: ['thesis', 'why-now'],
    excerpt:
      'For the whole history of work, making something cost something. That floor just fell out — for code, prose, images, audio, all of it, in the same eighteen months. The winners are the ones who can still tell what is worth keeping.',
    body: [
      {
        type: 'p',
        text: 'Every prior productivity wave made one kind of output cheaper. The printing press did text. The camera did images. The spreadsheet did numbers. Each took a generation to land, and each left the others alone.',
      },
      {
        type: 'p',
        text: 'What is different about this one is the simultaneity. In roughly eighteen months the marginal cost of producing a paragraph, a function, a slide, a thumbnail and a voiceover all collapsed toward zero at the same time. Production is no longer the bottleneck in knowledge work. For the first time it is free in every medium at once.',
      },
      { type: 'h2', text: 'Cheap production breaks an old assumption' },
      {
        type: 'p',
        text: 'When making things was expensive, the act of producing was itself a filter. If someone wrote a document, a person spent an hour on it, which meant they had at least decided it was worth an hour. Volume was a weak but real signal of intent.',
      },
      {
        type: 'p',
        text: 'That signal is gone. A thousand words now costs the same as ten. So the output of an organisation tells you almost nothing about what it actually values. The filter has to move somewhere else, and right now, in most companies, it has moved nowhere. It just stopped existing.',
      },
      { type: 'quote', text: 'When everything is cheap to make, the scarce skill is knowing what is worth keeping.' },
      { type: 'h2', text: 'The winners already know this' },
      {
        type: 'p',
        text: 'The teams pulling ahead are not the ones generating the most. They are the ones with taste — a fast, shared, defensible sense of what is good enough to ship and what is slop to be cut. That judgement used to live quietly inside senior people. Now it is the whole game, and it does not scale by hiring more senior people.',
      },
      {
        type: 'p',
        text: 'Slopagotchi is the layer that makes that judgement visible and continuous. A pet per teammate, fed by the quality of what they actually ship, sat in a shared zoo where the whole team can see it. Taste, externalised. Cheap to produce was always coming. Knowing what to keep is the part you cannot fake.',
      },
    ],
  },
  {
    slug: 'reputation-should-be-portable',
    title: 'Your reputation should be portable: Slopagotchi on AT Protocol',
    date: '2026-03-24',
    author: 'August Sandmo',
    role: 'Co-founder',
    readingTime: '5 min',
    tags: ['moat', 'atproto'],
    excerpt:
      'The score your pet earns is a reputation record. It belongs to the person who earned it, not to us — which is exactly why we built it on an open protocol instead of a database we control.',
    body: [
      {
        type: 'p',
        text: 'A Slopagotchi is fun. The thing underneath it is serious: a running, verifiable record of how much care a person puts into what they ship. That is reputation, and reputation is the most valuable and most abused asset in knowledge work.',
      },
      {
        type: 'p',
        text: 'Most platforms capture reputation and lock it in. Your rating, your karma, your stars — they live in someone else\'s database and die the day you leave. We think that is exactly backwards.',
      },
      { type: 'h2', text: 'Records, not rows in our database' },
      {
        type: 'p',
        text: 'Slopagotchi reputation is written to the AT Protocol as portable records keyed to your identity. The data is yours. You can take it to another app, another employer, another tool that speaks the same protocol. We are a view over your records, not the owner of them.',
      },
      {
        type: 'ul',
        items: [
          'Identity-first: scores attach to a person, not to a seat we rent you.',
          'Portable: leave the product and keep the record.',
          'Verifiable: a web of trust, signed, not a number we could quietly edit.',
        ],
      },
      { type: 'h2', text: 'Why this is the moat' },
      {
        type: 'p',
        text: 'A competitor can clone the pets in a weekend. The art is not the hard part. What they cannot clone is years of accrued, signed reputation across a web of people who trust each other. That compounds per identity and gets more valuable the longer it runs.',
      },
      {
        type: 'quote',
        text: 'Anyone can copy the toy. Nobody can copy the trust that accumulated underneath it.',
      },
      {
        type: 'p',
        text: 'Building on an open protocol feels like giving something away. It is the opposite. By refusing to own the reputation, we make it worth far more — and we make ourselves the place people choose to view it.',
      },
    ],
  },
  {
    slug: 'cleaning-company-runs-on-git',
    title: 'A cleaning company runs its ops in git. So this is not a dev-tools company.',
    date: '2026-02-09',
    author: 'Simen Sandmo',
    role: 'Co-founder',
    readingTime: '7 min',
    tags: ['market', 'case-study'],
    excerpt:
      'Vaskeladden is a cleaning company. It runs its operations in git and already checks its own writing for slop. If the market for this were developers, that sentence would be impossible. It is not impossible. That is the whole point.',
    body: [
      {
        type: 'p',
        text: 'When people hear "quality gate that lives in git," they file it under developer tooling and move on. We understand the instinct. We also think it is the single biggest misread of what is happening.',
      },
      { type: 'h2', text: 'Vaskeladden' },
      {
        type: 'p',
        text: 'Vaskeladden is a cleaning company. Not a metaphor — an actual company that cleans actual buildings. Its operations live in git: rotas, standard procedures, customer docs, the lot. And it already runs its written output through a slop check before it ships, because a procedure full of confident, generated filler is worse than no procedure at all.',
      },
      {
        type: 'p',
        text: 'None of the people doing this would call themselves developers. They adopted git because it is the best version-controlled, reviewable home for the knowledge a company runs on. The tooling escaped the engineering org years ago. We are just the first to notice it took quality control with it.',
      },
      { type: 'quote', text: 'Slop is not a developer problem. It is a knowledge-work problem that happens to pass through git.' },
      { type: 'h2', text: 'Why "everyone now" is not hand-waving' },
      {
        type: 'p',
        text: 'The market for a slop filter is not "companies with engineers." It is "companies that ship knowledge through a reviewable pipeline" — and AI pushed that to nearly everyone, because the cheapest place to catch generated junk is the moment it tries to get committed.',
      },
      {
        type: 'ul',
        items: [
          'Marketing teams shipping copy and briefs.',
          'Operations teams shipping procedures and runbooks.',
          'Support teams shipping macros and knowledge-base articles.',
          'And yes, engineers shipping code — but they are a slice, not the market.',
        ],
      },
      {
        type: 'p',
        text: 'A Slopagotchi does not care what you ship. It cares whether what you ship is worth keeping. A cleaner\'s pet and an engineer\'s pet live in the same zoo and are judged on the same thing: care. That is what makes this a knowledge-work company wearing a dev-tools costume.',
      },
    ],
  },
  {
    slug: 'slop-is-the-waste-line',
    title: 'Slop is the waste line on every AI budget',
    date: '2025-12-18',
    author: 'August Sandmo',
    role: 'Co-founder',
    readingTime: '5 min',
    tags: ['thesis', 'economics'],
    excerpt:
      'Junk code, unread docs, content nobody kept. Free to produce, paid for forever in storage and compute. It is the one line item on every AI budget that nobody has put a name to. We named it.',
    body: [
      {
        type: 'p',
        text: 'Ask a finance team where AI spend goes and you will get a clean answer: model calls, GPUs, storage, the platform fees. Ask where the waste is and you will get silence — not because there is none, but because nobody measures the thing that is bleeding.',
      },
      { type: 'h2', text: 'The shape of the waste' },
      {
        type: 'p',
        text: 'Slop is output that was free to make and is expensive to keep. The function nobody will ever call but that now ships in every build. The forty-page document generated to answer a question that needed two sentences. The draft, the variant, the "just in case" artefact that gets committed, indexed, backed up, and quietly re-trained on.',
      },
      {
        type: 'p',
        text: 'Each individual piece is too cheap to worry about. That is the trap. The cost is not in producing it; it is in storing it forever, indexing it, serving it, and feeding it back into the next model as if it were signal.',
      },
      { type: 'quote', text: 'Free to produce. Paid for forever. That is the definition of a waste line, and slop is the biggest one AI created.' },
      { type: 'h2', text: 'You cannot cut what you cannot see' },
      {
        type: 'p',
        text: 'The reason this line item has no name is that slop is invisible at the moment it is created. It looks exactly like work. It compiles, it reads fluently, it fills the page. By the time it shows up as a storage bill or a degraded retrieval result, it is buried under a year of commits and impossible to trace back.',
      },
      {
        type: 'p',
        text: 'Slopagotchi makes it visible at the source — the instant it tries to ship — and gives the cost a face that flinches: a pet that gets visibly queasy when you feed it junk. Make the waste line legible at the moment of creation and you can finally cut it before it compounds.',
      },
    ],
  },
  {
    slug: 'no-data-centers-in-space',
    title: 'You do not need data centers in space',
    date: '2025-11-21',
    author: 'Simen Sandmo',
    role: 'Co-founder',
    readingTime: '6 min',
    tags: ['thesis', 'infrastructure'],
    excerpt:
      'The industry wants to launch compute off-planet to survive the AI capacity crunch. The crunch is self-inflicted. Cut slop at the source and you reclaim most of it without leaving the ground.',
    body: [
      {
        type: 'p',
        text: 'There is a genuinely serious conversation happening about putting data centers in orbit. Cheaper cooling, abundant solar, room to grow. It is being driven by a real fear: that demand for AI compute and storage is outrunning what we can build on Earth.',
      },
      {
        type: 'p',
        text: 'We want to make an unfashionable claim. The crunch is largely self-inflicted, and the cheapest terawatt is the one you never spend. You do not need data centers in space. You need to stop storing slop.',
      },
      { type: 'h2', text: 'Most of what AI makes is never kept on purpose' },
      {
        type: 'p',
        text: 'When production is free, generation expands to fill every prompt. A large fraction of what gets generated is never read, never reused, never deliberately kept — and yet it is treated exactly like the valuable minority: stored, replicated, indexed, and folded back into training sets.',
      },
      {
        type: 'p',
        text: 'Our working estimate, from what we have seen across teams, is that cutting slop at the source reclaims on the order of 80% of the capacity an organisation thinks it needs. Not by compressing harder or buying denser disks — by simply not committing the junk in the first place.',
      },
      { type: 'quote', text: 'The macro bet: the capacity crunch is a slop problem wearing an infrastructure costume. No orbit required.' },
      { type: 'h2', text: 'Source-side beats sink-side' },
      {
        type: 'p',
        text: 'Every other answer to the crunch works at the sink: better compression, cheaper storage, more efficient chips, and yes, launching racks into space. They all assume the flood of output is fixed and try to make room for it.',
      },
      {
        type: 'p',
        text: 'Cutting at the source is the only intervention that shrinks the flood itself. A Slopagotchi sits at the exact moment output tries to become permanent and asks the only question that matters: is this worth keeping? Get that right at the source and the data center you were going to launch into space turns out to be one you never needed.',
      },
    ],
  },
  {
    slug: 'a-tamagotchi-for-your-codebase',
    title: 'Why we built a Tamagotchi for your codebase',
    date: '2025-10-14',
    author: 'August Sandmo',
    role: 'Co-founder',
    readingTime: '4 min',
    tags: ['product', 'origin'],
    excerpt:
      'Dashboards measuring code quality already exist. Nobody looks at them. So we made the metric a creature that lives on your desk, that your whole team can see, and that visibly suffers when you feed it slop.',
    body: [
      {
        type: 'p',
        text: 'The first version of this idea was a dashboard. It had charts. It had a quality score. It was, by every reasonable measure, correct. And nobody opened it twice.',
      },
      {
        type: 'p',
        text: 'The problem with a number is that it does not need you. A 72 sits there being a 72 whether you look or not. There is no relationship, no stakes, nothing that makes the metric feel like it is yours.',
      },
      { type: 'h2', text: 'The Tamagotchi insight' },
      {
        type: 'p',
        text: 'People who would never check a quality dashboard kept a digital pet alive on a keychain for months as kids, feeding it, cleaning up after it, panicking when it got sick. The mechanic is ancient and it works: tie a number to a creature that depends on you, and suddenly the number has a pulse.',
      },
      {
        type: 'p',
        text: 'So the health of your Slopagotchi is the quality of what you ship — including the actual score. Feed it clean work and it thrives. Feed it slop and it gets queasy, then sad, then loud about it. The metric did not change. The relationship to it did.',
      },
      { type: 'quote', text: 'A dashboard you can ignore. A pet that is visibly dying because of you is harder to scroll past.' },
      { type: 'h2', text: 'A zoo, not a leaderboard' },
      {
        type: 'p',
        text: 'And it is social by design. Everyone in your org can see everyone\'s pet — names above creatures, like a little zoo. Not a ranked leaderboard, which breeds gaming and resentment, but a shared space where care is simply visible. Your pet is yours, but it lives in public.',
      },
      {
        type: 'p',
        text: 'That is the whole product. Tamagotchi branding, Club Penguin warmth, and underneath it the most honest quality metric your team has ever actually paid attention to. Pick a shell, hatch your egg, and meet the little guy who lives off your clean code.',
      },
    ],
  },
]

/** Posts sorted newest-first by date. */
export const POSTS_BY_DATE = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1))

/** Look up a single post by slug. */
export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug) || null
}

/** Format an ISO date as e.g. "14 Oct 2025". */
export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${y}`
}
