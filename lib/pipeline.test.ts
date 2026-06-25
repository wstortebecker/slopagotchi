// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScoredPatch, PullRoundRef } from "./types";
import type { HealthDiagnostic } from "./health";

// In-memory store backing the mocks, so claim/dedup behaviour is realistic.
const state = vi.hoisted(() => ({
  claimed: new Set<string>(),
  diags: new Map<string, Map<string, HealthDiagnostic>>(),
}));

vi.mock("./atproto/resolve", () => ({
  resolvePds: vi.fn(async () => "https://pds.example"),
}));
vi.mock("./atproto/read", () => ({
  createReadAgent: vi.fn(() => ({})),
  listPullRounds: vi.fn(),
  fetchPatchText: vi.fn(async () => "PATCH TEXT"),
}));
vi.mock("./github/read", () => ({
  listAuthoredPrRefs: vi.fn(async () => []),
  fetchPrDiff: vi.fn(async () => "GH PATCH"),
}));
vi.mock("./scorer/featherless", () => ({ scorePatch: vi.fn() }));
vi.mock("./atproto/write", () => ({
  getServiceAgent: vi.fn(async () => ({ agent: {}, did: "did:plc:service" })),
  writeDiagnostic: vi.fn(async (input: { round: number }) => ({
    uri: `at://did:plc:service/app.slopgotchi.diagnostic/d${input.round}`,
    cid: "cid",
    rkey: `d${input.round}`,
  })),
  putPetState: vi.fn(async () => ({ uri: "at://pet", cid: "cid", rkey: "pet" })),
  buildPetStateRecord: vi.fn((input) => input),
}));
vi.mock("./store", () => ({
  claimRound: vi.fn(async (prUri: string, round: number) => {
    const k = `${prUri}#${round}`;
    if (state.claimed.has(k)) return false;
    state.claimed.add(k);
    return true;
  }),
  releaseRound: vi.fn(async (prUri: string, round: number) => {
    state.claimed.delete(`${prUri}#${round}`);
  }),
  markRoundDone: vi.fn(async () => {}),
  recordDiagnostic: vi.fn(
    async (did: string, prUri: string, round: number, d: HealthDiagnostic) => {
      const m = state.diags.get(did) ?? new Map<string, HealthDiagnostic>();
      m.set(`${prUri}#${round}`, d);
      state.diags.set(did, m);
    },
  ),
  getDiagnostics: vi.fn(async (did: string) =>
    Array.from(state.diags.get(did)?.values() ?? []),
  ),
  getHandleForDid: vi.fn(async () => "dev.test"),
  cachePetState: vi.fn(async () => {}),
}));

import {
  processSubject,
  processGitHubSubject,
  processStandaloneGitHub,
  SCORE_CONCURRENCY,
} from "./pipeline";
import { listPullRounds } from "./atproto/read";
import { listAuthoredPrRefs, fetchPrDiff } from "./github/read";
import { scorePatch } from "./scorer/featherless";
import { writeDiagnostic, putPetState } from "./atproto/write";
import { releaseRound, markRoundDone } from "./store";
import type { GitHubPrRef } from "./types";

const DID = "did:plc:dev";

function ref(prUri: string, roundIndex: number, cid = `cid-${roundIndex}`): PullRoundRef {
  return { prUri, roundIndex, cid, title: "t", createdAt: "2026-06-24T00:00:00Z" };
}

function ghRef(prNumber: number, headSha = "sha", createdAt = "2026-06-24T00:00:00Z"): GitHubPrRef {
  return {
    source: "github",
    owner: "o",
    repo: "r",
    prNumber,
    headSha,
    prUrl: `https://github.com/o/r/pull/${prNumber}`,
    title: `gh ${prNumber}`,
    createdAt,
  };
}

function scoreOf(score: number): ScoredPatch {
  return {
    score: {
      score,
      verdict: score < 21 ? "clean" : "sloppy",
      categories: {
        scopeDiscipline: 1,
        specificity: 1,
        dependencyRestraint: 1,
        testThoughtfulness: 1,
        maintainability: 1,
      },
      reasons: ["r"],
      medicine: [],
      confidence: "high",
    },
    provenance: { model: "m", seed: 1, rulesetVersion: "v1" },
  };
}

beforeEach(() => {
  state.claimed.clear();
  state.diags.clear();
  vi.clearAllMocks();
  vi.mocked(scorePatch).mockResolvedValue(scoreOf(10));
});

describe("processSubject", () => {
  it("scores all rounds and creates pet state on a fresh DID", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0), ref("at://pr1", 1)]);
    const res = await processSubject(DID, { pds: "x" });
    expect(res).toMatchObject({ processed: 2, failed: 0, petUpdated: true });
    expect(writeDiagnostic).toHaveBeenCalledTimes(2);
    expect(putPetState).toHaveBeenCalledTimes(1);
  });

  it("treats two rounds of one PR as distinct claims", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0), ref("at://pr1", 1)]);
    const res = await processSubject(DID, { pds: "x" });
    expect(res.processed).toBe(2);
  });

  it("does not write a second diagnostic when a round is seen again (AE4)", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0)]);
    await processSubject(DID, { pds: "x" });
    vi.clearAllMocks();
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0)]);
    const res = await processSubject(DID, { pds: "x" });
    expect(res.processed).toBe(0);
    expect(res.skipped).toBe(1);
    expect(writeDiagnostic).not.toHaveBeenCalled();
    expect(putPetState).not.toHaveBeenCalled();
  });

  it("scores a new round on an already-scored PR without duplicating the prior (AE3)", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0)]);
    await processSubject(DID, { pds: "x" });
    vi.clearAllMocks();
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(10));
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0), ref("at://pr1", 1)]);
    const res = await processSubject(DID, { pds: "x" });
    expect(res.processed).toBe(1); // only round 1 is new
    expect(writeDiagnostic).toHaveBeenCalledTimes(1);
    expect(writeDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ round: 1 }),
      expect.anything(),
    );
    expect(putPetState).toHaveBeenCalledTimes(1);
  });

  it("releases the claim and retries on a later poll when a round fails", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0)]);
    vi.mocked(scorePatch).mockRejectedValueOnce(new Error("scorer down"));
    const first = await processSubject(DID, { pds: "x" });
    expect(first.failed).toBe(1);
    expect(first.processed).toBe(0);
    expect(releaseRound).toHaveBeenCalledWith("at://pr1", 0);

    // Next poll: claim is free again, scorer recovers → round is scored.
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(10));
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0)]);
    const second = await processSubject(DID, { pds: "x" });
    expect(second.processed).toBe(1);
  });

  it("one failing round does not abort the rest of the batch", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([
      ref("at://pr1", 0),
      ref("at://pr2", 0),
    ]);
    vi.mocked(scorePatch)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(scoreOf(10));
    const res = await processSubject(DID, { pds: "x" });
    expect(res.failed).toBe(1);
    expect(res.processed).toBe(1);
  });

  it("honours maxRounds, leaving the rest for later", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([
      ref("at://pr1", 0),
      ref("at://pr2", 0),
      ref("at://pr3", 0),
    ]);
    const res = await processSubject(DID, { pds: "x", maxRounds: 2 });
    expect(res.processed).toBe(2);
    expect(writeDiagnostic).toHaveBeenCalledTimes(2);
  });

  it("scores rounds concurrently but never exceeds SCORE_CONCURRENCY in flight", async () => {
    const rounds = Array.from({ length: 8 }, (_, i) => ref("at://pr" + i, 0));
    vi.mocked(listPullRounds).mockResolvedValue(rounds);
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(scorePatch).mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return scoreOf(10);
    });
    const res = await processSubject(DID, { pds: "x" });
    expect(res.processed).toBe(8);
    expect(maxInFlight).toBeGreaterThan(1); // actually concurrent
    expect(maxInFlight).toBeLessThanOrEqual(SCORE_CONCURRENCY); // but bounded
  });

  it("only scores the most recent SCORE_WINDOW rounds, skipping the ancient tail", async () => {
    process.env.SCORE_WINDOW = "5";
    try {
      const rounds = Array.from({ length: 40 }, (_, i) => ref("at://pr" + i, 0));
      vi.mocked(listPullRounds).mockResolvedValue(rounds);
      const res = await processSubject(DID, { pds: "x" });
      expect(res.processed).toBe(5); // only the first (newest) 5 are scored
      expect(writeDiagnostic).toHaveBeenCalledTimes(5);
    } finally {
      delete process.env.SCORE_WINDOW;
    }
  });

  it("sets pet-state health to computeHealth over the cached diagnostics", async () => {
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0), ref("at://pr1", 1)]);
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(40));
    await processSubject(DID, { pds: "x" });
    const passed = vi.mocked(putPetState).mock.calls[0][0];
    // Two diagnostics each slop 40 → weighted slop 40 → health 60 (mild band).
    expect(passed.health.health).toBe(60);
    expect(passed.health.band).toBe("mild");
    expect(passed.health.diagnosticCount).toBe(2);
  });
});

describe("processGitHubSubject", () => {
  const ok = () => Promise.resolve(true);

  it("claims, scores, and writes GitHub PRs with source: 'github'", async () => {
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(5)]);
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const res = await processGitHubSubject(DID, "octocat", { verifyProof: ok });
    expect(res).toMatchObject({ processed: 1, failed: 0, petUpdated: true });
    expect(writeDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "github",
        prUri: "github:o/r#5@sha",
        round: 0,
        prUrl: "https://github.com/o/r/pull/5",
        github: expect.objectContaining({ owner: "o", prNumber: 5, headSha: "sha" }),
      }),
      expect.anything(),
    );
  });

  it("blends Tangled + GitHub diagnostics into one rolling average (AE3, R9, KTD3)", async () => {
    // A Tangled diagnostic lands first…
    vi.mocked(listPullRounds).mockResolvedValue([ref("at://pr1", 0)]);
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(40));
    await processSubject(DID, { pds: "x" });

    // …then a GitHub diagnostic for the SAME DID.
    vi.clearAllMocks();
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(5)]);
    vi.mocked(fetchPrDiff).mockResolvedValue("GH PATCH");
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    await processGitHubSubject(DID, "octocat", { verifyProof: ok });

    // Pet state is recomputed over the union of both sources — one average, not two.
    const passed = vi.mocked(putPetState).mock.calls[0][0];
    expect(passed.health.diagnosticCount).toBe(2);
  });

  it("re-scores a PR only when its head SHA advances (AE2, R6)", async () => {
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(5, "sha1")]);
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const first = await processGitHubSubject(DID, "octocat", { verifyProof: ok });
    expect(first.processed).toBe(1);

    // Same head SHA → already claimed → skipped, not re-scored.
    vi.clearAllMocks();
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(5, "sha1")]);
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const again = await processGitHubSubject(DID, "octocat", { verifyProof: ok });
    expect(again.processed).toBe(0);
    expect(again.skipped).toBe(1);
    expect(writeDiagnostic).not.toHaveBeenCalled();

    // Advanced head SHA → distinct claim → scored once more.
    vi.clearAllMocks();
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(5, "sha2")]);
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const pushed = await processGitHubSubject(DID, "octocat", { verifyProof: ok });
    expect(pushed.processed).toBe(1);
  });

  it("does not score and leaves diagnostics intact when proof fails (R3)", async () => {
    const res = await processGitHubSubject(DID, "octocat", {
      verifyProof: () => Promise.resolve(false),
    });
    expect(res).toMatchObject({ processed: 0, petUpdated: false });
    expect(listAuthoredPrRefs).not.toHaveBeenCalled();
    expect(writeDiagnostic).not.toHaveBeenCalled();
  });

  it("skips an over-large diff (null) by consuming the claim without scoring", async () => {
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(9)]);
    vi.mocked(fetchPrDiff).mockResolvedValue(null); // 406 over-large diff
    const res = await processGitHubSubject(DID, "octocat", { verifyProof: ok });
    expect(res.processed).toBe(0);
    expect(res.skipped).toBe(1);
    expect(writeDiagnostic).not.toHaveBeenCalled();
    expect(markRoundDone).toHaveBeenCalledWith("github:o/r#9@sha", 0);
  });

  it("honours the GitHub round budget independently", async () => {
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(1), ghRef(2), ghRef(3)]);
    vi.mocked(fetchPrDiff).mockResolvedValue("GH PATCH");
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const res = await processGitHubSubject(DID, "octocat", { verifyProof: ok, maxRounds: 2 });
    expect(res.processed).toBe(2);
    expect(writeDiagnostic).toHaveBeenCalledTimes(2);
  });
});

describe("processStandaloneGitHub", () => {
  it("scores public PRs into a github:<login> subject without any proof", async () => {
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(7)]);
    vi.mocked(fetchPrDiff).mockResolvedValue("GH PATCH");
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const res = await processStandaloneGitHub("OctoCat");
    expect(res).toMatchObject({ did: "github:octocat", processed: 1, petUpdated: true });
    // Enumerates by the raw username; keys diagnostics + pet to the lowered subject.
    expect(listAuthoredPrRefs).toHaveBeenCalledWith("OctoCat", expect.anything());
    expect(writeDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "github:octocat",
        source: "github",
        prUri: "github:o/r#7@sha",
      }),
      expect.anything(),
    );
    const passed = vi.mocked(putPetState).mock.calls[0][0];
    expect(passed.subject).toBe("github:octocat");
    expect(passed.handle).toBe("OctoCat"); // username doubles as display handle
  });

  it("honours the round budget", async () => {
    vi.mocked(listAuthoredPrRefs).mockResolvedValue([ghRef(1), ghRef(2), ghRef(3)]);
    vi.mocked(fetchPrDiff).mockResolvedValue("GH PATCH");
    vi.mocked(scorePatch).mockResolvedValue(scoreOf(20));
    const res = await processStandaloneGitHub("octocat", { maxRounds: 2 });
    expect(res.processed).toBe(2);
    expect(writeDiagnostic).toHaveBeenCalledTimes(2);
  });
});
