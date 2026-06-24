import { AtpAgent } from "@atproto/api";
import { gunzipSync } from "node:zlib";
import {
  PULL_COLLECTION,
  PullRecordSchema,
  type BlobRef,
  type DecodedRound,
  type PullRoundRef,
} from "../types";
import { resolvePds } from "./resolve";

/**
 * The read layer: enumerate a developer's `sh.tangled.repo.pull` records and
 * decode each round's inline patch blob to git-format-patch text.
 *
 * Everything here uses an unauthenticated agent — developer data is public.
 * Round metadata (listing) is separated from patch fetching so the pipeline can
 * claim a round for idempotency *before* spending a getBlob on it.
 */

export class ReadError extends Error {
  constructor(
    message: string,
    readonly subject?: string,
  ) {
    super(message);
    this.name = "ReadError";
  }
}

/** Builds an unauthenticated agent pointed at a developer's PDS. */
export function createReadAgent(pds: string): AtpAgent {
  return new AtpAgent({ service: pds });
}

/** Extracts the CID string from a (possibly un-hydrated) blob ref. */
export function cidFromBlob(blob: BlobRef | undefined | null): string | null {
  if (!blob) return null;
  const ref = blob.ref as unknown;
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null) {
    const link = (ref as { $link?: unknown }).$link;
    if (typeof link === "string") return link;
    if (typeof (ref as { toString?: unknown }).toString === "function") {
      const s = String(ref);
      if (s && s !== "[object Object]") return s;
    }
  }
  return null;
}

/** Gunzips patch bytes, falling back to raw UTF-8 if they aren't gzipped. */
export function decodePatchBytes(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  // gzip magic number 0x1f 0x8b
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString("utf8");
  }
  try {
    return gunzipSync(buf).toString("utf8");
  } catch {
    return buf.toString("utf8");
  }
}

/**
 * Lists every pull record for a DID and flattens it into per-round refs
 * (metadata only; no patch fetched). Paginates the full cursor loop.
 */
export async function listPullRounds(
  agent: AtpAgent,
  did: string,
): Promise<PullRoundRef[]> {
  const out: PullRoundRef[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  while (true) {
    let res;
    try {
      res = await agent.com.atproto.repo.listRecords({
        repo: did,
        collection: PULL_COLLECTION,
        limit: 100,
        cursor,
      });
    } catch (err) {
      throw new ReadError(
        `listRecords failed for ${did}: ${(err as Error).message}`,
        did,
      );
    }

    for (const rec of res.data.records) {
      const parsed = PullRecordSchema.safeParse(rec.value);
      if (!parsed.success) continue; // malformed record: skip, don't crash the batch
      const { rounds, title, target, source } = parsed.data;
      rounds.forEach((round, roundIndex) => {
        out.push({
          prUri: rec.uri,
          roundIndex,
          cid: cidFromBlob(round.patchBlob),
          title,
          target,
          source,
          createdAt: round.createdAt,
        });
      });
    }

    const next = res.data.cursor;
    if (!next || res.data.records.length === 0 || seenCursors.has(next)) break;
    seenCursors.add(next);
    cursor = next;
  }

  return out;
}

/** Fetches and decodes a single patch blob to git-format-patch text. */
export async function fetchPatchText(
  agent: AtpAgent,
  did: string,
  cid: string,
): Promise<string> {
  let res;
  try {
    res = await agent.com.atproto.sync.getBlob({ did, cid });
  } catch (err) {
    throw new ReadError(
      `getBlob failed for ${did}/${cid}: ${(err as Error).message}`,
      did,
    );
  }
  return decodePatchBytes(res.data);
}

/**
 * Convenience: enumerate every round for a DID and decode its patch.
 * Used by backfill and tests; the pipeline prefers the split
 * {@link listPullRounds} + {@link fetchPatchText} so it can claim before fetching.
 */
export async function* enumerateDecodedRounds(
  did: string,
  pds?: string,
): AsyncGenerator<DecodedRound> {
  const resolvedPds = pds ?? (await resolvePds(did));
  const agent = createReadAgent(resolvedPds);
  const rounds = await listPullRounds(agent, did);
  for (const ref of rounds) {
    if (!ref.cid) continue;
    const patchText = await fetchPatchText(agent, did, ref.cid);
    yield { ...ref, patchText };
  }
}
