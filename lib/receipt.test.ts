import { describe, it, expect } from "vitest";
import { buildReceipt } from "./receipt";
import type { DiagnosticRecord } from "./types";

function diag(over: Partial<DiagnosticRecord>): DiagnosticRecord {
  return {
    $type: "app.slopgotchi.diagnostic",
    subject: "did:plc:dev",
    prUri: "at://x/c/r1",
    round: 0,
    score: 50,
    scoreIsSample: true,
    verdict: "sloppy",
    categories: {
      scopeDiscipline: 1,
      specificity: 1,
      dependencyRestraint: 1,
      testThoughtfulness: 1,
      maintainability: 1,
    },
    reasons: ["r"],
    medicine: ["m"],
    confidence: "high",
    provenance: { model: "m", seed: 1, rulesetVersion: "v1" },
    createdAt: "2026-06-24T00:00:00Z",
    ...over,
  };
}

describe("buildReceipt", () => {
  it("returns empty data for no diagnostics", () => {
    expect(buildReceipt([])).toEqual({ prs: [], latestReasons: [], latestMedicine: [] });
  });

  it("computes a per-PR delta across rounds (improvement is negative)", () => {
    const r = buildReceipt([
      diag({ prUri: "at://pr1", round: 0, score: 80, createdAt: "2026-06-20T00:00:00Z" }),
      diag({ prUri: "at://pr1", round: 1, score: 20, createdAt: "2026-06-21T00:00:00Z" }),
    ]);
    expect(r.prs).toHaveLength(1);
    expect(r.prs[0].latestScore).toBe(20);
    expect(r.prs[0].delta).toBe(-60); // 20 - 80
    expect(r.prs[0].rounds).toBe(2);
  });

  it("omits the delta for a single-round PR", () => {
    const r = buildReceipt([diag({ prUri: "at://pr1", round: 0, score: 40 })]);
    expect(r.prs[0].delta).toBeUndefined();
  });

  it("orders PRs newest first and surfaces the latest reasons/medicine", () => {
    const r = buildReceipt([
      diag({ prUri: "at://old", score: 10, reasons: ["old"], medicine: ["oldfix"], createdAt: "2026-06-10T00:00:00Z" }),
      diag({ prUri: "at://new", score: 70, reasons: ["new"], medicine: ["newfix"], createdAt: "2026-06-23T00:00:00Z" }),
    ]);
    expect(r.prs[0].prUri).toBe("at://new");
    expect(r.latestReasons).toEqual(["new"]);
    expect(r.latestMedicine).toEqual(["newfix"]);
  });
});
