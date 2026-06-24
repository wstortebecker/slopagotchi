import { Redis } from "@upstash/redis";
import type { HealthDiagnostic } from "./health";

/**
 * Thin wrapper over Upstash Redis — the single datastore for Slopgotchi.
 *
 * Holds three concerns:
 *  - idempotency claims for processed (PR, round) pairs   (U6)
 *  - the per-developer diagnostic cache for health        (U6)
 *  - the connected-accounts / teams registry              (U7)
 *
 * The client is created lazily so importing this module never throws when the
 * env is unconfigured (lets unit tests run and integration tests skip cleanly).
 */

let client: Redis | null = null;

/** First env var ending with `suffix` and not containing any `exclude` token. */
function envBySuffix(suffix: string, exclude: string[] = []): string | undefined {
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith(suffix) && value && !exclude.some((e) => key.includes(e))) {
      return value;
    }
  }
  return undefined;
}

/**
 * Resolves the Upstash REST URL+token, supporting both the plain
 * `UPSTASH_REDIS_REST_*` names and the Vercel Upstash-KV integration's
 * `<PREFIX>_KV_REST_API_*` names (any prefix). The read-only token is ignored.
 */
function resolveRedisConfig(): { url?: string; token?: string } {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? envBySuffix("KV_REST_API_URL");
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    envBySuffix("KV_REST_API_TOKEN", ["READ_ONLY"]);
  return { url, token };
}

/** Whether Upstash credentials are present in the environment. */
export function isStoreConfigured(): boolean {
  const { url, token } = resolveRedisConfig();
  return Boolean(url && token);
}

/**
 * Returns the shared Redis client, creating it on first use.
 * Throws if the environment is not configured — callers that must degrade
 * gracefully should guard with {@link isStoreConfigured} first.
 */
export function getRedis(): Redis {
  const { url, token } = resolveRedisConfig();
  if (!url || !token) {
    throw new Error(
      "Upstash Redis is not configured: set UPSTASH_REDIS_REST_URL/TOKEN or a <PREFIX>_KV_REST_API_URL/TOKEN pair.",
    );
  }
  if (!client) {
    client = new Redis({ url, token });
  }
  return client;
}

/**
 * Round-trips a value through Redis to confirm connectivity.
 * Used by the U1 deploy smoke check.
 */
export async function healthCheck(): Promise<boolean> {
  const redis = getRedis();
  const key = "slopgotchi:healthcheck";
  const token = `ok:${Date.now()}`;
  await redis.set(key, token, { ex: 60 });
  const read = await redis.get<string>(key);
  return read === token;
}

// --- normalization ----------------------------------------------------------

export function normalizeHandle(handle: string): string {
  return handle.toLowerCase().replace(/^@/, "").trim();
}

// --- idempotency claims (U6) ------------------------------------------------

/**
 * A round's claim has two phases, both stored under the same key:
 *  - in-flight claim: short TTL, taken before processing. If the function is
 *    hard-killed mid-score (e.g. Vercel maxDuration), the claim auto-expires
 *    quickly so the next poll retries instead of wedging the round for days.
 *  - done marker: long TTL, written only after the diagnostic is persisted, so
 *    a completed round isn't needlessly re-scored on every poll.
 * Re-scoring after expiry is harmless: the diagnostic write (deterministic
 * rkey) and the cache (HSET field) both overwrite, so a re-claim never dupes.
 */
const CLAIM_TTL_SECONDS = 5 * 60; // in-flight; > a single score, < quick recovery
const DONE_TTL_SECONDS = 7 * 24 * 60 * 60;

export function claimKey(prUri: string, round: number): string {
  return `diag:${prUri}:${round}`;
}

/** Atomically claims a (PR, round) for processing. Returns true if newly claimed. */
export async function claimRound(prUri: string, round: number): Promise<boolean> {
  const res = await getRedis().set(claimKey(prUri, round), "in-flight", {
    nx: true,
    ex: CLAIM_TTL_SECONDS,
  });
  return res === "OK";
}

/** Marks a round durably done (long TTL) after its diagnostic is persisted. */
export async function markRoundDone(prUri: string, round: number): Promise<void> {
  await getRedis().set(claimKey(prUri, round), "done", { ex: DONE_TTL_SECONDS });
}

/** Releases a claim so the round is retried on the next poll (on failure). */
export async function releaseRound(prUri: string, round: number): Promise<void> {
  await getRedis().del(claimKey(prUri, round));
}

// --- per-developer diagnostic cache for health (U6) -------------------------

export function diagsKey(did: string): string {
  return `diags:${did}`;
}

/** Records a diagnostic for a developer, keyed by (prUri, round) so it's idempotent. */
export async function recordDiagnostic(
  did: string,
  prUri: string,
  round: number,
  diag: HealthDiagnostic,
): Promise<void> {
  await getRedis().hset(diagsKey(did), {
    [`${prUri}#${round}`]: JSON.stringify(diag),
  });
}

/** Safely coerces a Redis value (string JSON or already-parsed object) to T, or null. */
function safeParse<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/** Returns all cached diagnostics for a developer (for the health projection). */
export async function getDiagnostics(did: string): Promise<HealthDiagnostic[]> {
  const all = await getRedis().hgetall<Record<string, unknown>>(diagsKey(did));
  if (!all) return [];
  return Object.values(all)
    .map((v) => safeParse<HealthDiagnostic>(v))
    .filter((d): d is HealthDiagnostic => d !== null);
}

// --- connected-accounts / teams registry (U7/U8) ----------------------------

const teamDidsKey = (team: string) => `team:${team}:dids`;
const accountKey = (did: string) => `account:${did}`;
const handleKey = (handle: string) => `handle:${normalizeHandle(handle)}`;
const TEAMS_KEY = "teams";
const CONNECTED_DIDS_KEY = "connected:dids";

export interface Account {
  did: string;
  handle: string;
  team: string;
}

/** Registers (idempotently) a developer into a team, with handle↔DID mappings. */
export async function registerAccount(
  team: string,
  did: string,
  handle: string,
): Promise<void> {
  const redis = getRedis();
  const h = normalizeHandle(handle);
  await Promise.all([
    redis.sadd(teamDidsKey(team), did),
    redis.sadd(CONNECTED_DIDS_KEY, did),
    redis.sadd(TEAMS_KEY, team),
    redis.hset(accountKey(did), { handle: h, team }),
    redis.set(handleKey(h), did),
  ]);
}

export async function getAccount(did: string): Promise<Account | null> {
  const a = await getRedis().hgetall<{ handle: string; team: string }>(accountKey(did));
  if (!a || !a.handle) return null;
  return { did, handle: a.handle, team: a.team };
}

export async function getHandleForDid(did: string): Promise<string | undefined> {
  return (await getAccount(did))?.handle;
}

export async function getDidForHandle(handle: string): Promise<string | null> {
  return await getRedis().get<string>(handleKey(handle));
}

export async function getTeamDids(team: string): Promise<string[]> {
  return await getRedis().smembers(teamDidsKey(team));
}

export async function getConnectedDids(): Promise<string[]> {
  return await getRedis().smembers(CONNECTED_DIDS_KEY);
}

export async function getTeamAccounts(team: string): Promise<Account[]> {
  const dids = await getTeamDids(team);
  const accounts = await Promise.all(dids.map((d) => getAccount(d)));
  return accounts.filter((a): a is Account => a !== null);
}

// --- backfill progress + rate limiting (U7) --------------------------------

export type BackfillStatus = "running" | "done";

const backfillKey = (did: string) => `backfill:${did}`;

export async function setBackfillStatus(
  did: string,
  status: BackfillStatus,
): Promise<void> {
  await getRedis().set(backfillKey(did), status, { ex: 60 * 60 });
}

export async function getBackfillStatus(
  did: string,
): Promise<BackfillStatus | null> {
  return await getRedis().get<BackfillStatus>(backfillKey(did));
}

/** Fixed-window per-key rate limit. Returns whether this hit is allowed. */
export async function rateLimitHit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; count: number }> {
  const redis = getRedis();
  const key = `ratelimit:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return { allowed: count <= limit, count };
}

// --- cached pet state (read path for the zoo, U9) ---------------------------

const petStateCacheKey = (did: string) => `pet:${did}`;

export async function cachePetState(did: string, record: unknown): Promise<void> {
  await getRedis().set(petStateCacheKey(did), JSON.stringify(record));
}

export async function getCachedPetState<T = unknown>(
  did: string,
): Promise<T | null> {
  return safeParse<T>(await getRedis().get<unknown>(petStateCacheKey(did)));
}
