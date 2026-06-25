/* ============================================================================
   Scoreboard data — a global leaderboard of GitHub repos ranked by their pet's
   health (the inverse of slop shipped). Static demo roster, same spirit as the
   team zoo: deterministic rows so the board is never empty. Grouped by city;
   Oslo / Stockholm / New York / London are pinned to the top of the filter.
   ========================================================================== */

/** Big cities, by country. `top: true` pins it to the front of the filter. */
export const CITIES = [
  { id: 'oslo', name: 'Oslo', country: 'Norway', top: true },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', top: true },
  { id: 'nyc', name: 'New York', country: 'USA', top: true },
  { id: 'london', name: 'London', country: 'UK', top: true },
  { id: 'sf', name: 'San Francisco', country: 'USA' },
  { id: 'berlin', name: 'Berlin', country: 'Germany' },
  { id: 'paris', name: 'Paris', country: 'France' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands' },
  { id: 'copenhagen', name: 'Copenhagen', country: 'Denmark' },
  { id: 'toronto', name: 'Toronto', country: 'Canada' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan' },
  { id: 'sydney', name: 'Sydney', country: 'Australia' },
]

const CITY_NAME = Object.fromEntries(CITIES.map((c) => [c.id, c.name]))
const CITY_COUNTRY = Object.fromEntries(CITIES.map((c) => [c.id, c.country]))

/* Each repo's pet is scored from real PRs; `health` (0–100) is the rolling
   inverse of slop. The rest are the GitHub-side stats the board surfaces. */
const REPOS = [
  ['vercel/next.js', 'leerob', 'sf', 96, 18, 4, '2h ago'],
  ['nrkno/core', 'sindre', 'oslo', 93, 7, 2, '5h ago'],
  ['spotify/backstage', 'emma.l', 'stockholm', 91, 31, 6, '1d ago'],
  ['klarna/kustomer', 'johan.b', 'stockholm', 88, 22, 5, '3h ago'],
  ['monzo/ledger', 'priya.n', 'london', 84, 14, 3, '6h ago'],
  ['cockpit/oslo-rail', 'martin.h', 'oslo', 82, 9, 1, '1d ago'],
  ['stripe/checkout', 'dana.k', 'nyc', 79, 41, 9, '2h ago'],
  ['shopify/hydrogen', 'omar.f', 'toronto', 76, 27, 7, '4h ago'],
  ['ableton/live-web', 'lena.b', 'berlin', 71, 19, 4, '8h ago'],
  ['datadog/agent', 'pierre.m', 'paris', 68, 52, 12, '1d ago'],
  ['adyen/gateway', 'sven.t', 'amsterdam', 64, 33, 8, '3h ago'],
  ['unity/render', 'kenji.s', 'tokyo', 61, 44, 11, '2d ago'],
  ['atlassian/jira-fe', 'mia.r', 'sydney', 58, 38, 9, '5h ago'],
  ['novo/health-api', 'frederik.j', 'copenhagen', 54, 29, 7, '1d ago'],
  ['finn/marketplace', 'ingrid.s', 'oslo', 49, 61, 14, '2d ago'],
  ['tink/aggregator', 'erik.l', 'stockholm', 44, 57, 13, '3d ago'],
  ['nyt/news-app', 'rachel.w', 'nyc', 41, 72, 17, '1d ago'],
  ['deliveroo/router', 'tom.c', 'london', 37, 66, 16, '4h ago'],
  ['n26/banking-web', 'klaus.d', 'berlin', 32, 81, 19, '2d ago'],
  ['blablacar/maps', 'sophie.a', 'paris', 28, 88, 21, '3d ago'],
  ['booking/search', 'ruud.v', 'amsterdam', 24, 93, 23, '5d ago'],
  ['rakuten/pay', 'yuki.t', 'tokyo', 19, 104, 26, '4d ago'],
  ['canva/editor', 'jack.m', 'sydney', 14, 121, 29, '1w ago'],
  ['plaid/link', 'maria.g', 'nyc', 9, 138, 33, '6d ago'],
  ['kahoot/quiz-core', 'ola.n', 'oslo', 4, 167, 41, '2w ago'],
]

/** A row the Scoreboard table renders. Slop is the live inverse of health. */
export function scoreboardRows() {
  return REPOS.map(([repo, maintainer, cityId, health, openPRs, contributors, lastCommit], i) => ({
    id: repo,
    rank: i + 1,
    repo,
    maintainer,
    cityId,
    city: CITY_NAME[cityId] || cityId,
    country: CITY_COUNTRY[cityId] || '',
    health,
    slop: Math.max(0, 100 - health),
    openPRs,
    contributors,
    lastCommit,
    status: statusForHealth(health),
  }))
}

/** Health (0–100) → StatusBadge key, mirroring the engine's mood thresholds. */
export function statusForHealth(health) {
  if (health >= 80) return 'thriving'
  if (health >= 60) return 'ok'
  if (health >= 40) return 'sick'
  if (health >= 20) return 'critical'
  return 'dead'
}
