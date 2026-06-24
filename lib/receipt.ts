import type { DiagnosticRecord } from "./types";

/** One PR's summary for the receipt view. */
export interface PrSummary {
  prUri: string;
  prTitle?: string;
  latestScore: number;
  latestVerdict: string;
  /** latest round score − previous round score (same PR); omitted for single-round PRs. */
  delta?: number;
  rounds: number;
  createdAt: string;
}

export interface ReceiptData {
  prs: PrSummary[];
  latestReasons: string[];
  latestMedicine: string[];
}

/**
 * Pure projection of a subject's diagnostics into the receipt view: one row per
 * PR (latest round score + delta from the previous round), newest first, plus
 * the most recent diagnostic's reasons + medicine.
 */
export function buildReceipt(diagnostics: DiagnosticRecord[]): ReceiptData {
  if (diagnostics.length === 0) {
    return { prs: [], latestReasons: [], latestMedicine: [] };
  }

  const byPr = new Map<string, DiagnosticRecord[]>();
  for (const d of diagnostics) {
    const list = byPr.get(d.prUri) ?? [];
    list.push(d);
    byPr.set(d.prUri, list);
  }

  const prs: PrSummary[] = [];
  for (const [prUri, rounds] of byPr) {
    const sorted = [...rounds].sort((a, b) => a.round - b.round);
    const latest = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
    prs.push({
      prUri,
      prTitle: latest.prTitle,
      latestScore: latest.score,
      latestVerdict: latest.verdict,
      delta: prev ? latest.score - prev.score : undefined,
      rounds: sorted.length,
      createdAt: latest.createdAt,
    });
  }

  prs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const newest = [...diagnostics].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )[0];

  return {
    prs,
    latestReasons: newest.reasons,
    latestMedicine: newest.medicine,
  };
}
