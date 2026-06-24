import { type HealthBand, type HealthResult } from "./types";

/**
 * The health model: a pure projection of a developer's diagnostics into a
 * health score and band (R11–R13). No I/O — the pipeline passes the in-memory
 * diagnostic set (already-stored + just-scored) so health never depends on a
 * read-after-write. Any client can recompute this from the public records.
 *
 *   weights      w_i = d^i           for i = 0 (newest) .. N-1
 *   weightedSlop = Σ(w_i · slop_i) / Σ(w_i)
 *   health       = clamp(0, 100, round(100 − weightedSlop))
 */

export const DEFAULT_WINDOW_N = 10;
export const DEFAULT_DECAY = 0.8;

/** Health ≥ sharp → sharp; ≥ mild → mild; else sick. Tunable (see Open Questions). */
export const BAND_THRESHOLDS = { sharp: 70, mild: 40 } as const;

/** Minimal diagnostic shape the projection needs. */
export interface HealthDiagnostic {
  /** Raw 0–100 slop score (clamped defensively). */
  score: number;
  /** ISO timestamp; used to order by recency. */
  createdAt: string;
  /** AT-URI of the diagnostic record, for the latest-diagnostic pointer. */
  uri?: string;
}

export interface HealthOptions {
  windowN?: number;
  decay?: number;
}

const clamp = (lo: number, hi: number, x: number) => Math.max(lo, Math.min(hi, x));

/** Maps a health value to its band. */
export function bandForHealth(health: number): HealthBand {
  if (health >= BAND_THRESHOLDS.sharp) return "sharp";
  if (health >= BAND_THRESHOLDS.mild) return "mild";
  return "sick";
}

/**
 * Computes health + band from a developer's diagnostics. Empty input is the
 * distinct "no diagnoses yet" state (health 100, band null) — not a band (R12).
 */
export function computeHealth(
  diagnostics: HealthDiagnostic[],
  opts: HealthOptions = {},
): HealthResult {
  const windowN = opts.windowN ?? DEFAULT_WINDOW_N;
  const decay = opts.decay ?? DEFAULT_DECAY;

  if (diagnostics.length === 0) {
    return { health: 100, band: null, state: "no-diagnoses", diagnosticCount: 0 };
  }

  const sorted = [...diagnostics].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const window = sorted.slice(0, windowN);

  let weightedSum = 0;
  let weightTotal = 0;
  window.forEach((d, i) => {
    const w = Math.pow(decay, i);
    weightedSum += w * clamp(0, 100, d.score);
    weightTotal += w;
  });

  const weightedSlop = weightTotal === 0 ? 0 : weightedSum / weightTotal;
  const health = clamp(0, 100, Math.round(100 - weightedSlop));

  return {
    health,
    band: bandForHealth(health),
    state: "active",
    latestDiagnosticUri: window[0].uri,
    diagnosticCount: diagnostics.length,
  };
}
