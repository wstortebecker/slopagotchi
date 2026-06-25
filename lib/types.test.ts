// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  DiagnosticRecordSchema,
  DIAGNOSTIC_COLLECTION,
  githubPrUri,
  refClaimIdentity,
  subjectDidFromPrUri,
  type GitHubPrRef,
  type TangledRoundRef,
} from "./types";

const BASE_RECORD = {
  $type: DIAGNOSTIC_COLLECTION,
  subject: "did:plc:dev",
  prUri: "at://did:plc:dev/sh.tangled.repo.pull/r1",
  round: 0,
  score: 30,
  scoreIsSample: true as const,
  verdict: "minor" as const,
  categories: {
    scopeDiscipline: 8,
    specificity: 6,
    dependencyRestraint: 6,
    testThoughtfulness: 6,
    maintainability: 4,
  },
  reasons: ["broad change"],
  medicine: ["split it up"],
  confidence: "medium" as const,
  provenance: { model: "m", seed: 1, rulesetVersion: "v1" },
  createdAt: "2026-06-01T00:00:00Z",
};

describe("DiagnosticRecordSchema source field (KTD2)", () => {
  it("defaults source to 'tangled' when omitted (back-compat)", () => {
    const parsed = DiagnosticRecordSchema.parse(BASE_RECORD);
    expect(parsed.source).toBe("tangled");
  });

  it("accepts a github record with prUrl and coordinates", () => {
    const parsed = DiagnosticRecordSchema.parse({
      ...BASE_RECORD,
      prUri: "github:o/r#5@abc",
      source: "github",
      prUrl: "https://github.com/o/r/pull/5",
      github: { owner: "o", repo: "r", prNumber: 5, headSha: "abc" },
    });
    expect(parsed.source).toBe("github");
    expect(parsed.prUrl).toBe("https://github.com/o/r/pull/5");
    expect(parsed.github).toMatchObject({ owner: "o", prNumber: 5 });
  });

  it("rejects an unknown source value", () => {
    expect(
      DiagnosticRecordSchema.safeParse({ ...BASE_RECORD, source: "gitlab" }).success,
    ).toBe(false);
  });
});

describe("githubPrUri", () => {
  it("mints a github: synthetic prUri (KTD1)", () => {
    expect(
      githubPrUri({ owner: "o", repo: "r", prNumber: 42, headSha: "deadbeef" }),
    ).toBe("github:o/r#42@deadbeef");
  });

  it("a new head SHA produces a distinct prUri (R6)", () => {
    const a = githubPrUri({ owner: "o", repo: "r", prNumber: 42, headSha: "aaa" });
    const b = githubPrUri({ owner: "o", repo: "r", prNumber: 42, headSha: "bbb" });
    expect(a).not.toBe(b);
  });
});

describe("refClaimIdentity", () => {
  it("reduces a GitHub ref to (synthetic prUri, round 0)", () => {
    const ref: GitHubPrRef = {
      source: "github",
      owner: "o",
      repo: "r",
      prNumber: 7,
      headSha: "sha7",
      prUrl: "https://github.com/o/r/pull/7",
      createdAt: "2026-06-01T00:00:00Z",
    };
    expect(refClaimIdentity(ref)).toEqual({
      prUri: "github:o/r#7@sha7",
      round: 0,
    });
  });

  it("passes a Tangled ref's prUri/round through unchanged", () => {
    const ref: TangledRoundRef = {
      source: "tangled",
      prUri: "at://did:plc:dev/sh.tangled.repo.pull/r1",
      round: 2,
      cid: "bafy",
      createdAt: "2026-06-01T00:00:00Z",
    };
    expect(refClaimIdentity(ref)).toEqual({
      prUri: "at://did:plc:dev/sh.tangled.repo.pull/r1",
      round: 2,
    });
  });
});

describe("subjectDidFromPrUri", () => {
  it("extracts the DID from an AT-URI", () => {
    expect(subjectDidFromPrUri("at://did:plc:dev/sh.tangled.repo.pull/r1")).toBe("did:plc:dev");
  });

  it("throws a clear error when handed a synthetic github: prUri (not an AT-URI)", () => {
    expect(() => subjectDidFromPrUri("github:o/r#5@abc")).toThrow(/github:/);
  });
});
