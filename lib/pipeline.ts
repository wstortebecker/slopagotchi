import { resolvePds } from "./atproto/resolve.js";
import {
  createReadAgent,
  listPullRounds,
  fetchPatchText,
} from "./atproto/read.js";
import { listAuthoredPrRefs, fetchPrDiff } from "./github/read.js";
import { verifyOwnership } from "./github/proof.js";
import type { GitHubClient } from "./github/client.js";
import { scorePatch } from "./scorer/featherless.js";
import {
  getServiceAgent,
  writeDiagnostic,
  putPetState,
  buildPetStateRecord,
  type DiagnosticInput,
} from "./atproto/write.js";
import { computeHealth } from "./health.js";
import { mapWithConcurrency } from "./concurrency.js";
import {
  claimRound,
  releaseRound,
  markRoundDone,
  recordDiagnostic,
  getDiagnostics,
  getHandleForDid,
  cachePetState,
} from "./store.js";
import {
  refClaimIdentity,
  githubPrUri,
  githubSubject,
  type ScoreableRef,
  type TangledRoundRef,
  type GitHubPrRef,
} from "./types.js";

/**
 * The scoring pipeline: for a developer subject (DID, or a standalone
 * `github:<login>`), score unseen PRs and update protocol records exactly once
 * each (R6, R7, R13).
 *
 * Idempotency is a single atomic claim per ref (SETNX) on its `(prUri, round)`
 * identity. Claimed refs are scored CONCURRENTLY (bounded by SCORE_CONCURRENCY,
 * kept under the Featherless account concurrency limit) so a high-PR developer
 * drains fast. Each ref: fetch → score → write diagnostic (idempotent) → cache
 * → mark done. On any throw the claim is released so the ref retries next poll;
 * one failing ref never sinks the batch. Pet state is recomputed once, after the
 * batch. Backfill and cron are the same loop. Only enumeration and diff-fetch
 * differ per source (Tangled pulls vs GitHub PRs).
 */

/** Concurrent scores per invocation. Featherless account limit is 4; leave headroom. */
export const SCORE_CONCURRENCY = 3;

/**
 * Per-developer cap on how many of the most recent rounds we ever score.
 * Health is a rolling window of the most recent N=10 diagnostics and the receipt
 * shows recent PRs, so scoring an unbounded history (some repos have 400+ rounds)
 * is wasted model spend with no effect on the pet. listRecords returns
 * newest-first, so the first SCORE_WINDOW rounds are the most recent ones.
 * Raise SCORE_WINDOW to backfill deeper history.
 */
export function scoreWindow(): number {
  return Number(process.env.SCORE_WINDOW ?? 50);
}

/**
 * GitHub's own recency window, separate from Tangled's so the two sources don't
 * compete for one budget (KTD7). Defaults smaller — GitHub adds a per-PR
 * `head.sha` lookup on top of the diff fetch.
 */
export function githubScoreWindow(): number {
  return Number(process.env.GITHUB_SCORE_WINDOW ?? 30);
}

export interface ProcessOptions {
  /** PDS endpoint (skips re-resolution when the caller already has it). */
  pds?: string;
  /** Developer handle for the pet-state record (looked up if omitted). */
  handle?: string;
  /** Bound the number of rounds claimed+scored this invocation (backfill/cron caps). */
  maxRounds?: number;
}

export interface ProcessResult {
  did: string;
  processed: number;
  skipped: number;
  failed: number;
  petUpdated: boolean;
}

/**
 * Fetches a ref's diff. Returns the patch text, or `null` to PERMANENTLY skip
 * the ref (consume its claim without scoring) — e.g. a GitHub 406 over-large
 * diff. Distinct from a throw, which is transient (release + retry next pass).
 * Generic over the concrete ref type so each source's fetcher receives its own
 * shape without an unchecked cast.
 */
type DiffFetcher<R extends ScoreableRef> = (ref: R) => Promise<string | null>;

/** Maps any scoreable ref to the diagnostic write input, carrying source + coords. */
function toDiagnosticInput(
  subject: string,
  ref: ScoreableRef,
  scored: Awaited<ReturnType<typeof scorePatch>>,
  createdAt: string,
): DiagnosticInput {
  if (ref.source === "github") {
    return {
      subject,
      prUri: githubPrUri(ref),
      round: 0,
      prTitle: ref.title,
      source: "github",
      prUrl: ref.prUrl,
      github: {
        owner: ref.owner,
        repo: ref.repo,
        prNumber: ref.prNumber,
        headSha: ref.headSha,
      },
      scored,
      createdAt,
    };
  }
  return {
    subject,
    prUri: ref.prUri,
    round: ref.round,
    prTitle: ref.title,
    source: "tangled",
    scored,
    createdAt,
  };
}

type Outcome = "processed" | "skipped" | "failed";

/**
 * The source-agnostic score-and-publish core (phases 2 + 3). Claims each ref on
 * its `(prUri, round)` identity, fetches the diff via the source-specific
 * `fetchDiff`, scores it, writes the diagnostic with its `source`/`prUrl`,
 * records it into the shared `diags:${subject}` hash, and recomputes blended
 * health once after the batch (KTD3, R9). Only enumeration + diff-fetch differ
 * by source; everything below is identical for Tangled and GitHub.
 *
 * `subject` is the DID (Tangled / linked GitHub) or `github:<login>` (standalone);
 * it is the diagnostic/pet key. All records still live in the service repo.
 */
async function scoreRefs<R extends ScoreableRef>(
  subject: string,
  refs: R[],
  fetchDiff: DiffFetcher<R>,
  opts: { handle?: string; maxRounds?: number } = {},
): Promise<ProcessResult> {
  let skipped = 0;

  // Phase 1: atomically claim refs (fast Redis ops) up to the budget.
  const claimed: R[] = [];
  for (const ref of refs) {
    if (opts.maxRounds !== undefined && claimed.length >= opts.maxRounds) break;
    const { prUri, round } = refClaimIdentity(ref);
    if (await claimRound(prUri, round)) {
      claimed.push(ref);
    } else {
      skipped += 1; // already done or in-flight elsewhere
    }
  }

  // Phase 2: score + persist the claimed refs concurrently.
  const outcomes = await mapWithConcurrency(
    claimed,
    SCORE_CONCURRENCY,
    async (ref): Promise<Outcome> => {
      const { prUri, round } = refClaimIdentity(ref);
      try {
        const patchText = await fetchDiff(ref);
        if (patchText === null) {
          // Permanent skip (e.g. 406 over-large diff): consume the claim so we
          // don't re-attempt it forever; nothing to score.
          await markRoundDone(prUri, round);
          return "skipped";
        }
        const scored = await scorePatch(patchText, { title: ref.title });
        const createdAt = new Date().toISOString();
        const session = await getServiceAgent();
        const written = await writeDiagnostic(
          toDiagnosticInput(subject, ref, scored, createdAt),
          { session },
        );
        await recordDiagnostic(subject, prUri, round, {
          score: scored.score.score,
          createdAt,
          uri: written.uri,
        });
        await markRoundDone(prUri, round); // durable: don't re-score
        return "processed";
      } catch (err) {
        // Release the claim so the ref retries next poll; don't sink the batch.
        await releaseRound(prUri, round);
        console.error(
          `pipeline: ref ${prUri}#${round} failed:`,
          (err as Error).message,
        );
        return "failed";
      }
    },
  );

  const processed = outcomes.filter((o) => o === "processed").length;
  const failed = outcomes.filter((o) => o === "failed").length;
  skipped += outcomes.filter((o) => o === "skipped").length;

  // Phase 3: recompute health once over the full (blended) diagnostic set.
  let petUpdated = false;
  if (processed > 0) {
    const diagnostics = await getDiagnostics(subject);
    const health = computeHealth(diagnostics);
    const handle = opts.handle ?? (await getHandleForDid(subject));
    const session = await getServiceAgent();
    await putPetState({ subject, handle, health }, { session });
    await cachePetState(subject, buildPetStateRecord({ subject, handle, health }));
    petUpdated = true;
  }

  return { did: subject, processed, skipped, failed, petUpdated };
}

/** Scores a developer's recent Tangled pull rounds through the shared core. */
export async function processSubject(
  did: string,
  opts: ProcessOptions = {},
): Promise<ProcessResult> {
  const pds = opts.pds ?? (await resolvePds(did));
  const agent = createReadAgent(pds);
  const allRounds = await listPullRounds(agent, did);
  // Only ever score the most recent window (newest-first); skip the ancient tail.
  const windowed = allRounds.slice(0, scoreWindow());

  // Adapt to source-tagged refs, dropping rounds that carry no patch blob.
  let nullCid = 0;
  const refs: TangledRoundRef[] = [];
  for (const r of windowed) {
    if (!r.cid) {
      nullCid += 1;
      continue;
    }
    refs.push({
      source: "tangled",
      prUri: r.prUri,
      round: r.roundIndex,
      cid: r.cid,
      title: r.title,
      createdAt: r.createdAt,
    });
  }

  const fetchDiff: DiffFetcher<TangledRoundRef> = (ref) =>
    fetchPatchText(agent, did, ref.cid);

  const res = await scoreRefs(did, refs, fetchDiff, {
    handle: opts.handle,
    maxRounds: opts.maxRounds,
  });
  return { ...res, skipped: res.skipped + nullCid };
}

export interface GitHubProcessOptions {
  /** Developer handle for the pet-state record + proof binding (looked up if omitted). */
  handle?: string;
  /** Bound the number of PRs claimed+scored this invocation (backfill/cron caps). */
  maxRounds?: number;
  /** Recency window of PRs to enumerate (defaults to GITHUB_SCORE_WINDOW). */
  window?: number;
  /** Inject a GitHub client (testing / reuse). */
  client?: GitHubClient;
  /** Override the R3 proof re-check (testing). */
  verifyProof?: () => Promise<boolean>;
}

/**
 * Scores a linked developer's recent public GitHub PRs through the shared core.
 * Re-checks the ownership proof first (R3): on failure it returns early without
 * scoring and WITHOUT deleting any existing diagnostics — the link simply stops
 * accruing new GitHub scores.
 */
export async function processGitHubSubject(
  did: string,
  username: string,
  opts: GitHubProcessOptions = {},
): Promise<ProcessResult> {
  const proofOk = opts.verifyProof
    ? await opts.verifyProof()
    : await verifyOwnership(username, { handle: opts.handle, did }, { client: opts.client });
  if (!proofOk) {
    console.warn(`pipeline: github proof failed for ${username} (${did}); skipping`);
    return { did, processed: 0, skipped: 0, failed: 0, petUpdated: false };
  }

  const refs: GitHubPrRef[] = await listAuthoredPrRefs(username, {
    window: opts.window ?? githubScoreWindow(),
    client: opts.client,
  });

  const fetchDiff: DiffFetcher<GitHubPrRef> = (ref) =>
    fetchPrDiff(ref.owner, ref.repo, ref.prNumber, { client: opts.client });

  return scoreRefs(did, refs, fetchDiff, {
    handle: opts.handle,
    maxRounds: opts.maxRounds,
  });
}

export interface StandaloneGitHubOptions {
  /** Bound the number of PRs claimed+scored this invocation (backfill/cron caps). */
  maxRounds?: number;
  /** Recency window of PRs to enumerate (defaults to GITHUB_SCORE_WINDOW). */
  window?: number;
  /** Inject a GitHub client (testing / reuse). */
  client?: GitHubClient;
}

/**
 * Scores an UNLINKED GitHub developer's recent public PRs, keyed to a
 * `github:<login>` subject. No ownership proof is required: the data is public
 * and the subject IS the GitHub identity, so there is no other account to
 * impersonate. The GitHub username doubles as the pet's display handle, since no
 * atproto handle exists.
 *
 * Unify-going-forward: if the username is later linked + proven to a DID,
 * {@link linkGithubUsername} drops it from the standalone poll set and future
 * scores accrue under that DID via {@link processGitHubSubject}; the diagnostics
 * written here are left in place (not re-keyed).
 */
export async function processStandaloneGitHub(
  username: string,
  opts: StandaloneGitHubOptions = {},
): Promise<ProcessResult> {
  const subject = githubSubject(username);
  const refs: GitHubPrRef[] = await listAuthoredPrRefs(username, {
    window: opts.window ?? githubScoreWindow(),
    client: opts.client,
  });

  const fetchDiff: DiffFetcher<GitHubPrRef> = (ref) =>
    fetchPrDiff(ref.owner, ref.repo, ref.prNumber, { client: opts.client });

  return scoreRefs(subject, refs, fetchDiff, {
    handle: username,
    maxRounds: opts.maxRounds,
  });
}
