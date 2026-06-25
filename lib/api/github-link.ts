import {
  resolveIdentity,
  resolveIdentityByDid,
  IdentityResolutionError,
} from "../atproto/resolve.js";
import {
  rateLimitHit,
  linkGithubUsername,
  normalizeHandle,
  normalizeGithubUsername,
} from "../store.js";
import { verifyOwnership } from "../github/proof.js";
import { isGithubConfigured } from "../github/client.js";
import { processGitHubSubject } from "../pipeline.js";
import type { ApiResponse, Schedule } from "./http.js";

/**
 * The GitHub link handler: links a public GitHub username to a developer's DID
 * after verifying a no-OAuth ownership proof, then kicks off a bounded GitHub
 * backfill (R1–R3, R11, KTD6). The optional upgrade over the standalone path —
 * once linked, GitHub PRs feed the same pet as the developer's Tangled pulls.
 *
 * Framework-agnostic core of `POST /api/github/link`.
 */

export const RATE_LIMIT = 5;
export const RATE_WINDOW_SECONDS = 60;
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

export function githubBackfillRounds(): number {
  return Number(process.env.GITHUB_MAX_ROUNDS ?? 5);
}

export interface GithubLinkInput {
  /** Parsed request body: `{ handle?, did?, githubUsername }`. */
  body: unknown;
  /** Best-effort client IP for rate limiting. */
  ip: string;
  /** Runs the backfill after the response is sent. */
  schedule: Schedule;
}

export async function handleGithubLink({
  body,
  ip,
  schedule,
}: GithubLinkInput): Promise<ApiResponse> {
  if (!isGithubConfigured()) {
    return { status: 503, body: { error: "GitHub linking is not configured." } };
  }

  const raw = body as { handle?: unknown; did?: unknown; githubUsername?: unknown } | null;
  const handle = raw?.handle ? normalizeHandle(String(raw.handle)) : "";
  const did = raw?.did ? String(raw.did).trim() : "";
  const githubUsername = normalizeGithubUsername(String(raw?.githubUsername ?? ""));

  if (!handle && !did) {
    return { status: 400, body: { error: "A handle or did is required." } };
  }
  if (!GITHUB_USERNAME_RE.test(githubUsername)) {
    return { status: 400, body: { error: "A valid GitHub username is required." } };
  }

  const rl = await rateLimitHit(`github-link:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return {
      status: 429,
      body: { error: "Too many link attempts from your network. Try again in a minute." },
    };
  }

  let identity;
  try {
    identity = handle ? await resolveIdentity(handle) : await resolveIdentityByDid(did);
  } catch (err) {
    if (err instanceof IdentityResolutionError) {
      return {
        status: 400,
        body: { error: `Couldn't resolve "${handle || did}". Check it and try again.` },
      };
    }
    throw err;
  }
  const resolvedHandle = identity.handle ?? (handle || undefined);

  // R2: an unproven username is never linked.
  const proven = await verifyOwnership(githubUsername, {
    handle: resolvedHandle,
    did: identity.did,
  });
  if (!proven) {
    return {
      status: 403,
      body: {
        error:
          "Ownership proof not found. Add your handle or DID to your GitHub bio or a public 'slopgotchi-verify.md' gist, then retry.",
      },
    };
  }

  // R11: first-prover-wins — a username already proven for another DID is rejected.
  const link = await linkGithubUsername(identity.did, githubUsername);
  if (!link.ok) {
    return {
      status: 409,
      body: { error: "That GitHub username is already linked to another account." },
    };
  }

  schedule(async () => {
    try {
      await processGitHubSubject(identity.did, githubUsername, {
        handle: resolvedHandle,
        maxRounds: githubBackfillRounds(),
      });
    } catch (err) {
      console.error(`github backfill for ${identity.did} failed:`, (err as Error).message);
    }
  });

  return {
    status: 200,
    body: {
      ok: true,
      did: identity.did,
      handle: resolvedHandle,
      githubUsername,
      state: "backfilling",
    },
  };
}
