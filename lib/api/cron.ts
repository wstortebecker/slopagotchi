import { timingSafeEqual } from "node:crypto";
import { getConnectedDids, setBackfillStatus } from "../store.js";
import { processSubject } from "../pipeline.js";
import type { ApiResponse, Schedule } from "./http.js";

/**
 * The cron poll handler: re-scores connected identities (R6, R7).
 * Framework-agnostic core of the original `GET /api/cron/poll`.
 */

/** DIDs scanned per invocation; the rest are deferred to the tail / next poll. */
export function cronMaxDids(): number {
  return Number(process.env.CRON_MAX_DIDS ?? 10);
}

/**
 * Total rounds *scored* per invocation, across all DIDs. Bounds Featherless
 * work so a backlog can't blow the function's maxDuration; the rest is picked
 * up on subsequent polls (claims for any timed-out round expire in minutes).
 */
export function cronMaxRounds(): number {
  return Number(process.env.CRON_MAX_ROUNDS ?? 9); // ~3 concurrent waves within 60s
}

/** Constant-time bearer check against CRON_SECRET. */
export function isAuthorized(authHeader: string | undefined | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = authHeader ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false; // length leak is unavoidable; compare equal-length only
  return timingSafeEqual(a, b);
}

/** Processes one DID within the remaining round budget; returns rounds scored. */
async function runOne(did: string, roundBudget: number): Promise<number> {
  try {
    const res = await processSubject(did, { maxRounds: roundBudget });
    // The watcher has now picked this DID up — backfill phase is over for the UI.
    await setBackfillStatus(did, "done");
    return res.processed;
  } catch (err) {
    console.error(`cron: processSubject(${did}) failed:`, (err as Error).message);
    return 0;
  }
}

export interface CronInput {
  /** The `Authorization` header value. */
  authHeader: string | undefined | null;
  /** Runs the best-effort tail after the response is sent. */
  schedule: Schedule;
}

export async function handleCronPoll({ authHeader, schedule }: CronInput): Promise<ApiResponse> {
  if (!isAuthorized(authHeader)) {
    return { status: 401, body: { error: "unauthorized" } };
  }

  const dids = await getConnectedDids();
  const cap = cronMaxDids();
  const batch = dids.slice(0, cap);
  const tail = dids.slice(cap);

  let budget = cronMaxRounds();
  let scored = 0;
  for (const did of batch) {
    if (budget <= 0) break; // round budget spent; remaining DIDs wait for next poll
    const n = await runOne(did, budget);
    scored += n;
    budget -= n;
  }

  // Best-effort tail within this invocation; the next poll also re-scans (idempotent).
  if (tail.length > 0) {
    schedule(async () => {
      let tailBudget = cronMaxRounds();
      for (const did of tail) {
        if (tailBudget <= 0) break;
        tailBudget -= await runOne(did, tailBudget);
      }
    });
  }

  return {
    status: 200,
    body: {
      ok: true,
      connected: dids.length,
      processed: batch.length,
      scored,
      deferred: tail.length,
    },
  };
}
