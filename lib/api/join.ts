import { resolveIdentity, IdentityResolutionError } from "../atproto/resolve.js";
import {
  registerAccount,
  getDiagnostics,
  getBackfillStatus,
  setBackfillStatus,
  rateLimitHit,
  cachePetState,
  normalizeHandle,
} from "../store.js";
import { getServiceAgent, putPetState, buildPetStateRecord } from "../atproto/write.js";
import { computeHealth } from "../health.js";
import { processSubject } from "../pipeline.js";
import type { ApiResponse, Schedule } from "./http.js";

/**
 * The join handler: register a developer into a team and kick off a bounded
 * backfill (R1–R3). Framework-agnostic core of the original `POST /api/join`.
 */

export const RATE_LIMIT = 5;
export const RATE_WINDOW_SECONDS = 60;
// First backfill chunk (scored concurrently); the cron loop continues the
// remainder across subsequent polls. Sized to fit the 60s budget.
export function maxBackfillRounds(): number {
  return Number(process.env.MAX_BACKFILL_ROUNDS ?? 9);
}
const TEAM_RE = /^[a-z0-9][a-z0-9-]{0,38}$/;

export interface JoinInput {
  /** Parsed request body: `{ handle, team? }` — team is optional (personal roster). */
  body: unknown;
  /** Best-effort client IP for rate limiting. */
  ip: string;
  /** Runs the backfill after the response is sent. */
  schedule: Schedule;
}

export async function handleJoin({ body, ip, schedule }: JoinInput): Promise<ApiResponse> {
  const raw = body as { handle?: unknown; team?: unknown } | null | undefined;
  const handle = normalizeHandle(String(raw?.handle ?? ""));
  const team = String(raw?.team ?? "").toLowerCase().trim();

  if (!handle) {
    return { status: 400, body: { error: "A handle is required." } };
  }
  // A team is optional (a personal-roster add registers a dev for scoring with
  // no team). If one is given it must be a valid slug.
  if (team && !TEAM_RE.test(team)) {
    return {
      status: 400,
      body: { error: "A team slug must be letters, numbers, or hyphens." },
    };
  }

  const rl = await rateLimitHit(`join:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return {
      status: 429,
      body: { error: "Too many joins from your network. Try again in a minute." },
    };
  }

  let identity;
  try {
    identity = await resolveIdentity(handle);
  } catch (err) {
    if (err instanceof IdentityResolutionError) {
      return {
        status: 400,
        body: { error: `Couldn't resolve "${handle}". Check the handle and try again.` },
      };
    }
    throw err;
  }
  const { did, pds } = identity;

  await registerAccount(team, did, handle);

  // Guard against a duplicate-join backfill storm.
  const status = await getBackfillStatus(did);
  if (status !== "running") {
    await setBackfillStatus(did, "running");
    schedule(async () => {
      try {
        // Ensure the member shows up immediately, even with zero PRs (AE1).
        const existing = await getDiagnostics(did);
        if (existing.length === 0) {
          const session = await getServiceAgent();
          const health = computeHealth([]);
          await putPetState({ subject: did, handle, health }, { session });
          await cachePetState(did, buildPetStateRecord({ subject: did, handle, health }));
        }
        await processSubject(did, { pds, handle, maxRounds: maxBackfillRounds() });
      } catch (err) {
        console.error(`backfill for ${did} failed:`, (err as Error).message);
      } finally {
        await setBackfillStatus(did, "done");
      }
    });
  }

  return {
    status: 200,
    body: { ok: true, did, handle, team, state: "backfilling" },
  };
}
