import { listAllPetStates } from "../atproto/service.js";
import type { PetStateRecord } from "../types.js";
import type { ApiResponse } from "./http.js";

/**
 * The global scoreboard as JSON (the SPA renders it): every developer on the
 * Slopagotchi AT record — one `app.slopgotchi.pet.state` record each — ranked by
 * pet health, healthiest first. Reads the public service repo directly, so it
 * reflects the published truth rather than the Redis cache.
 *
 * Degrades to an empty, `configured:false` payload when the service read
 * identity isn't wired (or the PDS is unreachable), so the frontend can show
 * its empty state instead of erroring.
 */
export interface ScoreboardDTO {
  configured: boolean;
  developers: PetStateRecord[];
}

/**
 * Confidence-weighted ranking baseline + prior strength. We shrink each pet's
 * health toward {@link RANK_BASELINE} by its sample size (diagnostic count), so
 * a developer with few or no scored PRs can't top the board purely on the
 * health-100 "no diagnoses yet" default — health only earns its rank once it's
 * backed by real PRs.
 */
const RANK_BASELINE = 50; // neutral prior mean (a fresh, unproven pet sits mid-board)
const RANK_PRIOR_PRS = 5; // prior strength, in "virtual PRs"

/**
 * A pet's ranking score: its health shrunk toward the baseline by how many PRs
 * back it.  rank = (health·n + baseline·k) / (n + k). With n=0 it's exactly the
 * baseline; as n grows it converges to the raw health.
 */
export function rankScore(p: Pick<PetStateRecord, "health" | "diagnosticCount">): number {
  const n = Math.max(0, p.diagnosticCount);
  return (p.health * n + RANK_BASELINE * RANK_PRIOR_PRS) / (n + RANK_PRIOR_PRS);
}

/** Highest ranking score first; ties broken by more diagnostics, then handle/subject. */
function byRank(a: PetStateRecord, b: PetStateRecord): number {
  const ra = rankScore(a);
  const rb = rankScore(b);
  if (rb !== ra) return rb - ra;
  if (b.diagnosticCount !== a.diagnosticCount) return b.diagnosticCount - a.diagnosticCount;
  return (a.handle ?? a.subject).localeCompare(b.handle ?? b.subject);
}

export async function handleScoreboard(): Promise<ApiResponse> {
  try {
    const developers = (await listAllPetStates()).sort(byRank);
    return { status: 200, body: { configured: true, developers } satisfies ScoreboardDTO };
  } catch {
    // Service identity not configured / PDS unreachable: degrade gracefully.
    return { status: 200, body: { configured: false, developers: [] } satisfies ScoreboardDTO };
  }
}
