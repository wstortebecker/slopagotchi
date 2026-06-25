import { timingSafeEqual } from "node:crypto";
import {
  getConnectedDids,
  getAccount,
  setBackfillStatus,
  getStandaloneGithubUsers,
} from "../store.js";
import {
  processSubject,
  processGitHubSubject,
  processStandaloneGitHub,
} from "../pipeline.js";
import { isGithubConfigured } from "../github/client.js";
import type { ApiResponse, Schedule } from "./http.js";

/**
 * The cron poll handler: re-scores connected identities (R6, R7).
 * Framework-agnostic core of the original `GET /api/cron/poll`.
 *
 * Tangled and GitHub run on SEPARATE per-invocation round budgets so one source
 * can't starve the other under the 60s function / daily cron (KTD7). After the
 * linked DIDs, any leftover GitHub budget drains standalone (unlinked) GitHub
 * subjects. Everything is idempotent, so overflow is picked up next poll.
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

/**
 * GitHub's own per-invocation round budget, separate from the Tangled budget so
 * one source can't starve the other (KTD7).
 */
export function githubCronMaxRounds(): number {
  return Number(process.env.GITHUB_MAX_ROUNDS ?? 5);
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

interface RoundsScored {
  tangled: number;
  github: number;
}

/**
 * Drains one DID's sources within their separate budgets (KTD7): Tangled pulls
 * first, then — if a proven GitHub username is linked and GitHub is configured —
 * its public PRs. Each source's failure is logged and isolated; neither sinks
 * the other or the batch.
 */
async function runOne(
  did: string,
  tangledBudget: number,
  githubBudget: number,
): Promise<RoundsScored> {
  let tangled = 0;
  let github = 0;

  if (tangledBudget > 0) {
    try {
      const res = await processSubject(did, { maxRounds: tangledBudget });
      tangled = res.processed;
      // The watcher has now picked this DID up — backfill phase is over for the UI.
      await setBackfillStatus(did, "done");
    } catch (err) {
      console.error(`cron: processSubject(${did}) failed:`, (err as Error).message);
    }
  }

  if (githubBudget > 0 && isGithubConfigured()) {
    try {
      const account = await getAccount(did);
      if (account?.github) {
        const res = await processGitHubSubject(did, account.github, {
          handle: account.handle,
          maxRounds: githubBudget,
        });
        github = res.processed;
      }
    } catch (err) {
      console.error(`cron: github(${did}) failed:`, (err as Error).message);
    }
  }

  return { tangled, github };
}

/**
 * Drains standalone (unlinked) GitHub subjects within the remaining GitHub
 * budget, bounded by `cap` usernames. Each failure is logged and isolated.
 * Returns the rounds scored so the caller can decrement the shared budget.
 */
async function runStandaloneGithub(
  usernames: string[],
  budget: number,
  cap: number,
): Promise<number> {
  let scored = 0;
  let remaining = budget;
  for (const username of usernames.slice(0, cap)) {
    if (remaining <= 0) break;
    try {
      const res = await processStandaloneGitHub(username, { maxRounds: remaining });
      scored += res.processed;
      remaining -= res.processed;
    } catch (err) {
      console.error(
        `cron: standalone github(${username}) failed:`,
        (err as Error).message,
      );
    }
  }
  return scored;
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
  const githubOn = isGithubConfigured();

  let tangledBudget = cronMaxRounds();
  let githubBudget = githubCronMaxRounds();
  let scored = 0;
  let githubScored = 0;
  for (const did of batch) {
    // Stop once both source budgets are spent (GitHub budget only counts if on).
    if (tangledBudget <= 0 && (!githubOn || githubBudget <= 0)) break;
    const n = await runOne(did, Math.max(0, tangledBudget), Math.max(0, githubBudget));
    scored += n.tangled;
    tangledBudget -= n.tangled;
    githubScored += n.github;
    githubBudget -= n.github;
  }

  // Standalone (unlinked) GitHub subjects, within whatever GitHub budget remains
  // after the linked DIDs. Idempotent, so the daily poll continues any overflow.
  if (githubOn && githubBudget > 0) {
    const standalone = await getStandaloneGithubUsers();
    const n = await runStandaloneGithub(standalone, githubBudget, cap);
    githubScored += n;
    githubBudget -= n;
  }

  // Best-effort tail within this invocation; the next poll also re-scans (idempotent).
  if (tail.length > 0) {
    schedule(async () => {
      let tailTangled = cronMaxRounds();
      let tailGithub = githubCronMaxRounds();
      for (const did of tail) {
        if (tailTangled <= 0 && (!githubOn || tailGithub <= 0)) break;
        const n = await runOne(did, Math.max(0, tailTangled), Math.max(0, tailGithub));
        tailTangled -= n.tangled;
        tailGithub -= n.github;
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
      githubScored,
      deferred: tail.length,
    },
  };
}
