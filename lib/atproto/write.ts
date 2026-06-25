import { AtpAgent } from "@atproto/api";
import { createHash } from "node:crypto";
import {
  DIAGNOSTIC_COLLECTION,
  PET_STATE_COLLECTION,
  DiagnosticRecordSchema,
  PetStateRecordSchema,
  type DiagnosticRecord,
  type PetStateRecord,
  type HealthResult,
  type ScoredPatch,
} from "../types.js";

/**
 * The write layer: the service account publishes `app.slopgotchi.*` records to
 * its own repo. Both records use `putRecord` with deterministic rkeys so a
 * retry after an unacknowledged write overwrites rather than duplicates (KTD3
 * idempotency refinement). The app password lives only in env and the session
 * only in memory — never persisted to Redis (KTD1).
 */

export class WriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteError";
  }
}

export class RateLimitError extends WriteError {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export function isWriteConfigured(): boolean {
  return Boolean(
    process.env.SLOPGOTCHI_PDS &&
      process.env.SLOPGOTCHI_IDENTIFIER &&
      process.env.SLOPGOTCHI_APP_PASSWORD,
  );
}

export interface ServiceSession {
  agent: AtpAgent;
  did: string;
}

let session: ServiceSession | null = null;
let loginInFlight: Promise<ServiceSession> | null = null;

async function doLogin(): Promise<ServiceSession> {
  if (!isWriteConfigured()) {
    throw new WriteError(
      "Service account is not configured: set SLOPGOTCHI_PDS, SLOPGOTCHI_IDENTIFIER, SLOPGOTCHI_APP_PASSWORD.",
    );
  }
  const agent = new AtpAgent({ service: process.env.SLOPGOTCHI_PDS! });
  try {
    await agent.login({
      identifier: process.env.SLOPGOTCHI_IDENTIFIER!,
      password: process.env.SLOPGOTCHI_APP_PASSWORD!,
    });
  } catch (err) {
    throw new WriteError(`Service login failed: ${(err as Error).message}`);
  }
  if (!agent.did) throw new WriteError("Service login returned no DID");
  session = { agent, did: agent.did };
  return session;
}

/**
 * Logs the service account in (app password from env) and returns the
 * authenticated agent + its DID. Cached in-memory for the lifetime of a warm
 * serverless instance; no token is written to Redis. Concurrent first-callers
 * share a single in-flight login (parallel scoring won't trigger N logins).
 */
export async function getServiceAgent(): Promise<ServiceSession> {
  if (session) return session;
  if (!loginInFlight) {
    loginInFlight = doLogin().finally(() => {
      loginInFlight = null;
    });
  }
  return loginInFlight;
}

/** Resets the cached session (test helper). */
export function _resetServiceSession(): void {
  session = null;
  loginInFlight = null;
}

// --- rkeys ------------------------------------------------------------------

/** Deterministic diagnostic rkey from (prUri, round) → idempotent writes. */
export function diagnosticRkey(prUri: string, round: number): string {
  const h = createHash("sha256").update(`${prUri}#${round}`).digest("hex");
  return `d${h.slice(0, 24)}`;
}

/**
 * Sanitizes a subject DID into a valid rkey: allowed charset only
 * (`a-zA-Z0-9._~-`), ≤512 chars, never `.`/`..`. Stable per subject so pet
 * state is a single addressable record.
 */
export function sanitizeRkey(subject: string): string {
  let r = subject.replace(/[^a-zA-Z0-9._~-]/g, "_").slice(0, 512);
  if (r === "" || r === "." || r === "..") r = `_${r || "x"}_`;
  return r;
}

// --- record builders --------------------------------------------------------

export interface DiagnosticInput {
  subject: string;
  prUri: string;
  round: number;
  prTitle?: string;
  /** Source marker; defaults to "tangled" so existing callers are unaffected (KTD2). */
  source?: "tangled" | "github";
  /** Canonical web URL for the PR (github.com/...); present for GitHub sources. */
  prUrl?: string;
  /** GitHub PR coordinates; present for GitHub sources. */
  github?: { owner: string; repo: string; prNumber: number; headSha: string };
  scored: ScoredPatch;
  createdAt?: string;
}

/** Builds + validates a diagnostic record (throws before any network call if invalid). */
export function buildDiagnosticRecord(input: DiagnosticInput): DiagnosticRecord {
  const { score, provenance } = input.scored;
  const record: DiagnosticRecord = {
    $type: DIAGNOSTIC_COLLECTION,
    subject: input.subject,
    prUri: input.prUri,
    round: input.round,
    prTitle: input.prTitle,
    source: input.source ?? "tangled",
    prUrl: input.prUrl,
    github: input.github,
    score: score.score,
    scoreIsSample: true,
    verdict: score.verdict,
    categories: score.categories,
    reasons: score.reasons,
    medicine: score.medicine,
    confidence: score.confidence,
    provenance,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const parsed = DiagnosticRecordSchema.safeParse(record);
  if (!parsed.success) {
    throw new WriteError(
      `Invalid diagnostic record: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data;
}

export interface PetStateInput {
  subject: string;
  handle?: string;
  health: HealthResult;
  updatedAt?: string;
}

/** Builds + validates a pet-state record from a computed health result. */
export function buildPetStateRecord(input: PetStateInput): PetStateRecord {
  const record: PetStateRecord = {
    $type: PET_STATE_COLLECTION,
    subject: input.subject,
    handle: input.handle,
    health: input.health.health,
    band: input.health.band,
    state: input.health.state,
    diagnosticCount: input.health.diagnosticCount,
    latestDiagnosticUri: input.health.latestDiagnosticUri,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
  const parsed = PetStateRecordSchema.safeParse(record);
  if (!parsed.success) {
    throw new WriteError(
      `Invalid pet-state record: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data;
}

// --- writes -----------------------------------------------------------------

function wrapWriteError(err: unknown, what: string): never {
  const status = (err as { status?: number }).status;
  const msg = (err as Error).message ?? String(err);
  if (status === 429 || /rate limit|too many requests/i.test(msg)) {
    throw new RateLimitError(`${what} rate-limited: ${msg}`);
  }
  throw new WriteError(`${what} failed: ${msg}`);
}

/**
 * Writes (create-or-replace) a diagnostic record with a deterministic rkey.
 * Re-writing the same (prUri, round) overwrites the same record — no duplicate.
 */
export async function writeDiagnostic(
  input: DiagnosticInput,
  opts: { session?: ServiceSession } = {},
): Promise<{ uri: string; cid: string; rkey: string }> {
  const record = buildDiagnosticRecord(input); // validates first
  const { agent, did } = opts.session ?? (await getServiceAgent());
  const rkey = diagnosticRkey(input.prUri, input.round);
  try {
    const res = await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: DIAGNOSTIC_COLLECTION,
      rkey,
      record,
    });
    return { uri: res.data.uri, cid: res.data.cid, rkey };
  } catch (err) {
    wrapWriteError(err, "writeDiagnostic");
  }
}

/**
 * Writes (create-or-replace) the subject's single pet-state record, keyed by a
 * sanitized subject DID so it is one addressable record per developer.
 */
export async function putPetState(
  input: PetStateInput,
  opts: { session?: ServiceSession } = {},
): Promise<{ uri: string; cid: string; rkey: string }> {
  const record = buildPetStateRecord(input); // validates first
  const { agent, did } = opts.session ?? (await getServiceAgent());
  const rkey = sanitizeRkey(input.subject);
  try {
    const res = await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: PET_STATE_COLLECTION,
      rkey,
      record,
    });
    return { uri: res.data.uri, cid: res.data.cid, rkey };
  } catch (err) {
    wrapWriteError(err, "putPetState");
  }
}
