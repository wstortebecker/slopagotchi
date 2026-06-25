import { z } from "zod";

/**
 * Shared record + score types, with Zod as the single source of truth.
 * Grouped by layer; extended by the units that introduce each concern:
 *  - read layer (U2): the Tangled `sh.tangled.repo.pull` shape + decoded rounds
 *  - scorer (U3):     the slop score schema
 *  - write layer (U4): the published diagnostic + pet-state records
 */

export const PULL_COLLECTION = "sh.tangled.repo.pull";

// --- Read layer: sh.tangled.repo.pull (U2) ---------------------------------

/**
 * A blob ref as it appears once `@atproto/api` has parsed the record. Because
 * the Tangled lexicon is unknown to the SDK, the `ref` is hydrated into a `CID`
 * instance (not a plain `{ $link }`), so we keep it `unknown` and let
 * `cidFromBlob` extract the CID string from whatever shape it actually is
 * (CID instance, `{ $link }`, or a bare string).
 */
export const BlobRefSchema = z.object({
  $type: z.literal("blob").optional(),
  ref: z.unknown(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});
export type BlobRef = z.infer<typeof BlobRefSchema>;

export const PullRoundSchema = z.object({
  createdAt: z.string(),
  patchBlob: BlobRefSchema.optional(),
});
export type PullRound = z.infer<typeof PullRoundSchema>;

export const PullTargetSchema = z.object({
  repo: z.string(),
  branch: z.string(),
  repoDid: z.string().optional(),
});
export type PullTarget = z.infer<typeof PullTargetSchema>;

export const PullSourceSchema = z.object({
  branch: z.string(),
  repo: z.string().optional(),
});
export type PullSource = z.infer<typeof PullSourceSchema>;

export const PullRecordSchema = z.object({
  $type: z.literal(PULL_COLLECTION).optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  rounds: z.array(PullRoundSchema).default([]),
  source: PullSourceSchema.optional(),
  target: PullTargetSchema.optional(),
  createdAt: z.string().optional(),
});
export type PullRecord = z.infer<typeof PullRecordSchema>;

/** Metadata for one PR round — enough to claim and identify it before any blob fetch. */
export interface PullRoundRef {
  /** AT-URI of the pull record (`at://did/sh.tangled.repo.pull/rkey`). */
  prUri: string;
  /** Zero-based index of the round within the pull's `rounds[]`. */
  roundIndex: number;
  /** CID of the round's gzipped patch blob (null when the round carries no patch). */
  cid: string | null;
  title?: string;
  target?: PullTarget;
  source?: PullSource;
  createdAt: string;
}

/** A fully decoded round: a round ref plus its gunzipped git-format-patch text. */
export interface DecodedRound extends PullRoundRef {
  patchText: string;
}

// --- Source-tagged scoreable refs (U1/U5) ----------------------------------

/**
 * A unit of scoreable work, tagged by its source. The score core (U5) consumes
 * this discriminated union uniformly: it reduces any ref to a `(prUri, round)`
 * identity via {@link refClaimIdentity} and reuses the unchanged claim / dedup /
 * rkey machinery (KTD1). Only enumeration and diff-fetch differ per source.
 */
export interface TangledRoundRef {
  source: "tangled";
  /** AT-URI of the pull record (`at://did/sh.tangled.repo.pull/rkey`). */
  prUri: string;
  /** Zero-based round index within the pull's `rounds[]`. */
  round: number;
  /** CID of the round's gzipped patch blob. */
  cid: string;
  title?: string;
  createdAt: string;
}

export interface GitHubPrRef {
  source: "github";
  owner: string;
  repo: string;
  prNumber: number;
  /** Head SHA at enumeration time; a new push mints a distinct claim (R6). */
  headSha: string;
  /** Canonical github.com PR URL (`html_url`). */
  prUrl: string;
  title?: string;
  createdAt: string;
}

export type ScoreableRef = TangledRoundRef | GitHubPrRef;

/**
 * Mints the synthetic `prUri` for a GitHub PR (KTD1):
 * `github:${owner}/${repo}#${prNumber}@${headSha}`. The `github:` prefix
 * guarantees no collision with `at://` keys and is **not** an AT-URI — never
 * route it through {@link subjectDidFromPrUri}.
 */
export function githubPrUri(ref: {
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
}): string {
  return `github:${ref.owner}/${ref.repo}#${ref.prNumber}@${ref.headSha}`;
}

/**
 * The subject id for a STANDALONE (unlinked) GitHub developer: `github:<login>`.
 * A diagnostic/pet `subject` is either a developer DID (Tangled, or a GitHub
 * username whose owner has linked + proven it) or one of these — the GitHub
 * identity standing in for itself, since there is no atproto account to key
 * against. Records still live in the service repo, so `subject` is just the
 * stable key. Shape is distinct from {@link githubPrUri} (always `owner/repo#n@sha`)
 * and from a DID, so the three never collide. Lower-cased to match the
 * case-insensitive link registry; pass an already-normalized username.
 */
export function githubSubject(username: string): string {
  return `github:${username.toLowerCase()}`;
}

/** Whether a subject id is a standalone GitHub subject (vs a developer DID). */
export function isGithubSubject(subject: string): boolean {
  return subject.startsWith("github:");
}

/** Reduces any scoreable ref to the `(prUri, round)` identity used for claims, dedup, and rkeys. */
export function refClaimIdentity(ref: ScoreableRef): {
  prUri: string;
  round: number;
} {
  if (ref.source === "github") {
    return { prUri: githubPrUri(ref), round: 0 };
  }
  return { prUri: ref.prUri, round: ref.round };
}

// --- Scorer: slop score (U3) ----------------------------------------------

/**
 * The rubric categories and their maximum slop-point weights (sum = 100).
 * Each category score is *slop points* (0 = no slop in this dimension, weight =
 * maximally sloppy), so the categories sum to roughly the overall score.
 */
export const SLOP_CATEGORIES = [
  { key: "scopeDiscipline", label: "Scope discipline", weight: 25 },
  { key: "specificity", label: "Specificity & intent", weight: 20 },
  { key: "dependencyRestraint", label: "Dependency restraint", weight: 20 },
  { key: "testThoughtfulness", label: "Test thoughtfulness", weight: 20 },
  { key: "maintainability", label: "Maintainability", weight: 15 },
] as const;

export const SlopCategoriesSchema = z.object({
  scopeDiscipline: z.number().min(0).max(25),
  specificity: z.number().min(0).max(20),
  dependencyRestraint: z.number().min(0).max(20),
  testThoughtfulness: z.number().min(0).max(20),
  maintainability: z.number().min(0).max(15),
});
export type SlopCategories = z.infer<typeof SlopCategoriesSchema>;

/** Per-PR qualitative verdict. Distinct from the derived health *band*. */
export const SLOP_VERDICTS = ["clean", "minor", "sloppy", "severe"] as const;

export const SlopScoreSchema = z.object({
  /** Overall slop 0–100; higher = more slop. */
  score: z.number().int().min(0).max(100),
  verdict: z.enum(SLOP_VERDICTS),
  categories: SlopCategoriesSchema,
  /** Human-readable reasons the PR scored as it did. */
  reasons: z.array(z.string()).min(1),
  /** Suggested "medicine" — concrete fixes to lower the slop. */
  medicine: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
});
export type SlopScore = z.infer<typeof SlopScoreSchema>;

/** Provenance recorded alongside a score so a third party understands a re-score. */
export interface ScoreProvenance {
  model: string;
  seed: number;
  rulesetVersion: string;
}

/** A validated score plus the provenance of the run that produced it. */
export interface ScoredPatch {
  score: SlopScore;
  provenance: ScoreProvenance;
}

// --- Health model bands (shared by U4 write layer + U5 health) -------------

export const HEALTH_BANDS = ["sharp", "mild", "sick"] as const;
export type HealthBand = (typeof HEALTH_BANDS)[number];

/** The pet's life state: a band when there are diagnoses, else "no-diagnoses". */
export type PetLifeState = "active" | "no-diagnoses";

/** Output of the pure health projection (U5). */
export interface HealthResult {
  health: number;
  band: HealthBand | null;
  state: PetLifeState;
  latestDiagnosticUri?: string;
  diagnosticCount: number;
}

// --- Protocol records: the truth layer (U4) --------------------------------

export const DIAGNOSTIC_COLLECTION = "app.slopgotchi.diagnostic";
export const PET_STATE_COLLECTION = "app.slopgotchi.pet.state";

/** One scored PR round, published as a public, self-describing record. */
export const DiagnosticRecordSchema = z.object({
  $type: z.literal(DIAGNOSTIC_COLLECTION),
  /** The subject this diagnostic is about: a developer DID, or a standalone `github:<login>` subject. */
  subject: z.string(),
  /** AT-URI of the `sh.tangled.repo.pull` record, or a synthetic `github:` URI. */
  prUri: z.string(),
  round: z.number().int().min(0),
  prTitle: z.string().optional(),
  /**
   * Which source this diagnostic's PR came from. Defaults to "tangled" so every
   * pre-existing record and every Tangled writer that omits it still parses (KTD2).
   */
  source: z.enum(["tangled", "github"]).default("tangled"),
  /** Canonical web URL for the PR (github.com/...); present for GitHub sources. */
  prUrl: z.string().optional(),
  /** GitHub PR coordinates; present for `source: "github"`. */
  github: z
    .object({
      owner: z.string(),
      repo: z.string(),
      prNumber: z.number().int(),
      headSha: z.string(),
    })
    .optional(),
  /**
   * Raw 0–100 slop score. NOT independently reproducible — a cached sample of a
   * non-deterministic model run (KTD6). The qualitative `verdict` is the stable
   * signal; `provenance` explains why a re-score may differ.
   */
  score: z.number().int().min(0).max(100),
  scoreIsSample: z.literal(true),
  verdict: z.enum(SLOP_VERDICTS),
  categories: SlopCategoriesSchema,
  reasons: z.array(z.string()),
  medicine: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  provenance: z.object({
    model: z.string(),
    seed: z.number(),
    rulesetVersion: z.string(),
  }),
  createdAt: z.string(),
});
export type DiagnosticRecord = z.infer<typeof DiagnosticRecordSchema>;

/** One-per-developer pet state; a projection of that developer's diagnostics (R9). */
export const PetStateRecordSchema = z.object({
  $type: z.literal(PET_STATE_COLLECTION),
  subject: z.string(),
  handle: z.string().optional(),
  health: z.number().int().min(0).max(100),
  band: z.enum(HEALTH_BANDS).nullable(),
  state: z.enum(["active", "no-diagnoses"]),
  diagnosticCount: z.number().int().min(0),
  latestDiagnosticUri: z.string().optional(),
  updatedAt: z.string(),
});
export type PetStateRecord = z.infer<typeof PetStateRecordSchema>;

// --- helpers ----------------------------------------------------------------

/** The DID whose repo owns a pull (the developer being scored). */
export function subjectDidFromPrUri(prUri: string): string {
  // Synthetic GitHub prUris carry no DID — the linked DID is passed explicitly on
  // the write path (KTD1). Fail loudly with a clear message if one reaches here.
  if (prUri.startsWith("github:")) {
    throw new Error(
      `github: prUris are not AT-URIs and carry no subject DID: ${prUri}`,
    );
  }
  // at://did:plc:xxx/collection/rkey -> did:plc:xxx
  const m = prUri.match(/^at:\/\/([^/]+)\//);
  if (!m) throw new Error(`Malformed AT-URI: ${prUri}`);
  return m[1];
}
