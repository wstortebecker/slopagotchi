import {
  rateLimitHit,
  registerStandaloneGithub,
  getDidForGithub,
  normalizeGithubUsername,
} from "../store.js";
import { isGithubConfigured } from "../github/client.js";
import { processStandaloneGitHub } from "../pipeline.js";
import { githubSubject } from "../types.js";
import type { ApiResponse, Schedule } from "./http.js";

/**
 * The standalone GitHub handler — the low-friction default: no atproto account,
 * no ownership proof. Scores a public GitHub user's recent PRs into a pet keyed
 * to `github:<login>`, then registers it for the cron to re-poll. If an owner
 * has already linked + proven this username to a DID, this returns that DID's
 * pet instead of forking a divergent standalone one.
 *
 * Framework-agnostic core of `POST /api/github/standalone`.
 */

export const RATE_LIMIT = 5;
export const RATE_WINDOW_SECONDS = 60;
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

// First GitHub backfill chunk (scored after the response); the cron loop
// continues the remainder across subsequent polls. Read lazily so env overrides
// apply without a redeploy, matching the link handler + cron.
export function githubBackfillRounds(): number {
  return Number(process.env.GITHUB_MAX_ROUNDS ?? 5);
}

export interface GithubStandaloneInput {
  /** Parsed request body: `{ githubUsername }`. */
  body: unknown;
  /** Best-effort client IP for rate limiting. */
  ip: string;
  /** Runs the backfill after the response is sent. */
  schedule: Schedule;
}

export async function handleGithubStandalone({
  body,
  ip,
  schedule,
}: GithubStandaloneInput): Promise<ApiResponse> {
  if (!isGithubConfigured()) {
    return { status: 503, body: { error: "GitHub scoring is not configured." } };
  }

  const githubUsername = normalizeGithubUsername(
    String((body as { githubUsername?: unknown })?.githubUsername ?? ""),
  );
  if (!GITHUB_USERNAME_RE.test(githubUsername)) {
    return { status: 400, body: { error: "A valid GitHub username is required." } };
  }

  const rl = await rateLimitHit(`github-standalone:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return {
      status: 429,
      body: { error: "Too many attempts from your network. Try again in a minute." },
    };
  }

  // If an owner has already proven + linked this username, point at their pet
  // rather than forking a standalone one (the cron already scores it by DID).
  const linkedDid = await getDidForGithub(githubUsername);
  if (linkedDid) {
    return {
      status: 200,
      body: { ok: true, subject: linkedDid, githubUsername, linked: true, state: "linked" },
    };
  }

  await registerStandaloneGithub(githubUsername);

  schedule(async () => {
    try {
      await processStandaloneGitHub(githubUsername, { maxRounds: githubBackfillRounds() });
    } catch (err) {
      console.error(
        `github standalone backfill for ${githubUsername} failed:`,
        (err as Error).message,
      );
    }
  });

  return {
    status: 200,
    body: {
      ok: true,
      subject: githubSubject(githubUsername),
      githubUsername,
      state: "backfilling",
    },
  };
}
