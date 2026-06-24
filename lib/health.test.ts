import { describe, it, expect } from "vitest";
import {
  computeHealth,
  bandForHealth,
  BAND_THRESHOLDS,
  DEFAULT_WINDOW_N,
  type HealthDiagnostic,
} from "./health";

/** Builds a diagnostic `daysAgo` before a fixed epoch with the given slop. */
function diag(score: number, daysAgo: number, uri?: string): HealthDiagnostic {
  const base = Date.parse("2026-06-24T00:00:00Z");
  return {
    score,
    createdAt: new Date(base - daysAgo * 86_400_000).toISOString(),
    uri,
  };
}

describe("bandForHealth", () => {
  it("maps threshold edges to the expected band", () => {
    expect(bandForHealth(BAND_THRESHOLDS.sharp)).toBe("sharp"); // 70
    expect(bandForHealth(BAND_THRESHOLDS.sharp - 1)).toBe("mild"); // 69
    expect(bandForHealth(BAND_THRESHOLDS.mild)).toBe("mild"); // 40
    expect(bandForHealth(BAND_THRESHOLDS.mild - 1)).toBe("sick"); // 39
    expect(bandForHealth(100)).toBe("sharp");
    expect(bandForHealth(0)).toBe("sick");
  });
});

describe("computeHealth", () => {
  it("returns the no-diagnoses state for an empty history (R12)", () => {
    expect(computeHealth([])).toEqual({
      health: 100,
      band: null,
      state: "no-diagnoses",
      diagnosticCount: 0,
    });
  });

  it("a single clean diagnostic yields high health", () => {
    const r = computeHealth([diag(5, 0)]);
    expect(r.health).toBe(95);
    expect(r.band).toBe("sharp");
    expect(r.state).toBe("active");
  });

  it("points at the newest diagnostic's uri", () => {
    const r = computeHealth([diag(50, 2, "old"), diag(10, 0, "new")]);
    expect(r.latestDiagnosticUri).toBe("new");
  });

  it("climbs as a high-slop history is followed by clean PRs (AE2)", () => {
    const allSloppy = computeHealth([diag(90, 3), diag(90, 2), diag(90, 1), diag(90, 0)]);
    const recovered = computeHealth([diag(90, 3), diag(90, 2), diag(10, 1), diag(10, 0)]);
    expect(recovered.health).toBeGreaterThan(allSloppy.health);
  });

  it("weights a recent sloppy PR more than an equally-sloppy old one", () => {
    const recentSloppy = computeHealth([diag(10, 3), diag(90, 0)]);
    const oldSloppy = computeHealth([diag(90, 3), diag(10, 0)]);
    expect(recentSloppy.health).toBeLessThan(oldSloppy.health);
  });

  it("only counts the most recent N (the N+1th oldest has no effect)", () => {
    const recent = Array.from({ length: DEFAULT_WINDOW_N }, (_, i) => diag(20, i));
    const withExtreme = [...recent, diag(100, DEFAULT_WINDOW_N + 1)];
    expect(computeHealth(withExtreme).health).toBe(computeHealth(recent).health);
  });

  it("clamps pathological scores so health stays within 0–100", () => {
    expect(computeHealth([diag(500, 0)]).health).toBe(0);
    expect(computeHealth([diag(-200, 0)]).health).toBe(100);
  });

  it("reports the full diagnostic count even beyond the window", () => {
    const many = Array.from({ length: 15 }, (_, i) => diag(30, i));
    expect(computeHealth(many).diagnosticCount).toBe(15);
  });
});
