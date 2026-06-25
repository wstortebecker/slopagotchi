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

/** Healthiest first; ties broken by more diagnostics, then handle/subject. */
function byHealthDesc(a: PetStateRecord, b: PetStateRecord): number {
  if (b.health !== a.health) return b.health - a.health;
  if (b.diagnosticCount !== a.diagnosticCount) return b.diagnosticCount - a.diagnosticCount;
  return (a.handle ?? a.subject).localeCompare(b.handle ?? b.subject);
}

export async function handleScoreboard(): Promise<ApiResponse> {
  try {
    const developers = (await listAllPetStates()).sort(byHealthDesc);
    return { status: 200, body: { configured: true, developers } satisfies ScoreboardDTO };
  } catch {
    // Service identity not configured / PDS unreachable: degrade gracefully.
    return { status: 200, body: { configured: false, developers: [] } satisfies ScoreboardDTO };
  }
}
