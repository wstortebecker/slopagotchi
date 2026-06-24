import { resolvePds } from "./atproto/resolve";
import {
  createReadAgent,
  listPullRounds,
  fetchPatchText,
} from "./atproto/read";
import { scorePatch } from "./scorer/featherless";
import {
  getServiceAgent,
  writeDiagnostic,
  putPetState,
  buildPetStateRecord,
} from "./atproto/write";
import { computeHealth } from "./health";
import {
  claimRound,
  releaseRound,
  markRoundDone,
  recordDiagnostic,
  getDiagnostics,
  getHandleForDid,
  cachePetState,
} from "./store";
import type { PullRoundRef } from "./types";

/**
 * The scoring pipeline: for a developer DID, score unseen (PR, round) pairs and
 * update protocol records exactly once each (R6, R7, R13).
 *
 * Idempotency is a single atomic claim per round (SETNX). Claimed rounds are
 * scored CONCURRENTLY (bounded by SCORE_CONCURRENCY, kept under the Featherless
 * account concurrency limit) so a high-PR developer drains fast. Each round:
 * fetch → score → write diagnostic (idempotent) → cache → mark done. On any
 * throw the claim is released so the round retries next poll; one failing round
 * never sinks the batch. Pet state is recomputed once, after the batch.
 * Backfill and cron are the same loop.
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

/** Runs `fn` over `items` with at most `limit` in flight; preserves order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export async function processSubject(
  did: string,
  opts: ProcessOptions = {},
): Promise<ProcessResult> {
  const pds = opts.pds ?? (await resolvePds(did));
  const agent = createReadAgent(pds);
  const allRounds = await listPullRounds(agent, did);
  // Only ever score the most recent window (newest-first); skip the ancient tail.
  const rounds = allRounds.slice(0, scoreWindow());

  let skipped = 0;

  // Phase 1: atomically claim rounds (fast Redis ops) up to the budget.
  const claimed: PullRoundRef[] = [];
  for (const ref of rounds) {
    if (opts.maxRounds !== undefined && claimed.length >= opts.maxRounds) break;
    if (!ref.cid) {
      skipped += 1;
      continue;
    }
    if (await claimRound(ref.prUri, ref.roundIndex)) {
      claimed.push(ref);
    } else {
      skipped += 1; // already done or in-flight elsewhere
    }
  }

  // Phase 2: score + persist the claimed rounds concurrently.
  const outcomes = await mapWithConcurrency(
    claimed,
    SCORE_CONCURRENCY,
    async (ref) => {
      try {
        const patchText = await fetchPatchText(agent, did, ref.cid!);
        const scored = await scorePatch(patchText, { title: ref.title });
        const createdAt = new Date().toISOString();
        const session = await getServiceAgent();
        const written = await writeDiagnostic(
          {
            subject: did,
            prUri: ref.prUri,
            round: ref.roundIndex,
            prTitle: ref.title,
            scored,
            createdAt,
          },
          { session },
        );
        await recordDiagnostic(did, ref.prUri, ref.roundIndex, {
          score: scored.score.score,
          createdAt,
          uri: written.uri,
        });
        await markRoundDone(ref.prUri, ref.roundIndex); // durable: don't re-score
        return true;
      } catch (err) {
        // Release the claim so the round retries next poll; don't sink the batch.
        await releaseRound(ref.prUri, ref.roundIndex);
        console.error(
          `pipeline: round ${ref.prUri}#${ref.roundIndex} failed:`,
          (err as Error).message,
        );
        return false;
      }
    },
  );

  const processed = outcomes.filter(Boolean).length;
  const failed = outcomes.length - processed;

  // Phase 3: recompute health once over the full diagnostic set and publish.
  let petUpdated = false;
  if (processed > 0) {
    const diagnostics = await getDiagnostics(did);
    const health = computeHealth(diagnostics);
    const handle = opts.handle ?? (await getHandleForDid(did));
    const session = await getServiceAgent();
    await putPetState({ subject: did, handle, health }, { session });
    await cachePetState(did, buildPetStateRecord({ subject: did, handle, health }));
    petUpdated = true;
  }

  return { did, processed, skipped, failed, petUpdated };
}
