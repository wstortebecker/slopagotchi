// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DiagnosticRecord, PetStateRecord } from "../types";

vi.mock("../store", async (orig) => {
  const actual = await orig<typeof import("../store")>();
  return {
    normalizeHandle: actual.normalizeHandle,
    isStoreConfigured: vi.fn(() => true),
    getDidForHandle: vi.fn(),
    getCachedPetState: vi.fn(async () => null),
  };
});
vi.mock("../atproto/service", () => ({
  fetchPetState: vi.fn(async () => null),
  fetchDiagnosticsForSubject: vi.fn(async () => []),
}));

import { handlePet, type PetDTO } from "./pet";
import { isStoreConfigured, getDidForHandle, getCachedPetState } from "../store";
import { fetchPetState, fetchDiagnosticsForSubject } from "../atproto/service";

function diag(over: Partial<DiagnosticRecord> = {}): DiagnosticRecord {
  return {
    $type: "app.slopgotchi.diagnostic",
    subject: "did:plc:dev",
    prUri: "at://did:plc:dev/sh.tangled.repo.pull/abc",
    round: 0,
    prTitle: "Add feature",
    source: "tangled",
    score: 30,
    scoreIsSample: true,
    verdict: "minor",
    categories: {
      scopeDiscipline: 8,
      specificity: 6,
      dependencyRestraint: 6,
      testThoughtfulness: 6,
      maintainability: 4,
    },
    reasons: ["scope creep"],
    medicine: ["split the PR"],
    confidence: "medium",
    provenance: { model: "m", seed: 1, rulesetVersion: "v1" },
    createdAt: "2026-06-25T00:00:00.000Z",
    ...over,
  };
}

const pet: PetStateRecord = {
  $type: "app.slopgotchi.pet.state",
  subject: "did:plc:dev",
  handle: "alice",
  health: 70,
  band: "mild",
  state: "active",
  diagnosticCount: 1,
  updatedAt: "2026-06-25T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isStoreConfigured).mockReturnValue(true);
  vi.mocked(getDidForHandle).mockResolvedValue("did:plc:dev");
  vi.mocked(getCachedPetState).mockResolvedValue(null);
  vi.mocked(fetchPetState).mockResolvedValue(null);
  vi.mocked(fetchDiagnosticsForSubject).mockResolvedValue([]);
});

describe("handlePet", () => {
  it("404s when the store is unwired", async () => {
    vi.mocked(isStoreConfigured).mockReturnValue(false);
    const res = await handlePet("alice");
    expect(res.status).toBe(404);
  });

  it("404s for an unknown handle", async () => {
    vi.mocked(getDidForHandle).mockResolvedValue(null);
    const res = await handlePet("ghost");
    expect(res.status).toBe(404);
  });

  it("returns the cached pet + a built receipt", async () => {
    vi.mocked(getCachedPetState).mockResolvedValue(pet);
    vi.mocked(fetchDiagnosticsForSubject).mockResolvedValue([diag()]);
    const res = await handlePet("@Alice");
    expect(res.status).toBe(200);
    const body = res.body as PetDTO;
    expect(body.handle).toBe("alice");
    expect(body.pet?.health).toBe(70);
    expect(body.prs).toHaveLength(1);
    expect(body.latestReasons).toEqual(["scope creep"]);
    expect(body.latestMedicine).toEqual(["split the PR"]);
  });

  it("surfaces the pet even when diagnostics reads fail", async () => {
    vi.mocked(getCachedPetState).mockResolvedValue(pet);
    vi.mocked(fetchDiagnosticsForSubject).mockRejectedValue(new Error("unreachable"));
    const res = await handlePet("alice");
    expect(res.status).toBe(200);
    const body = res.body as PetDTO;
    expect(body.pet?.health).toBe(70);
    expect(body.prs).toEqual([]);
  });

  it("uses a github:<login> subject directly, bypassing handle resolution", async () => {
    const ghPet: PetStateRecord = { ...pet, subject: "github:octocat", handle: "octocat" };
    vi.mocked(getCachedPetState).mockResolvedValue(ghPet);
    vi.mocked(fetchDiagnosticsForSubject).mockResolvedValue([
      diag({ subject: "github:octocat", source: "github", prUri: "github:o/r#5@abc" }),
    ]);
    const res = await handlePet("github:OctoCat");
    expect(res.status).toBe(200);
    const body = res.body as PetDTO;
    expect(body.handle).toBe("github:octocat");
    expect(body.pet?.subject).toBe("github:octocat");
    expect(body.prs).toHaveLength(1);
    expect(getDidForHandle).not.toHaveBeenCalled();
    expect(getCachedPetState).toHaveBeenCalledWith("github:octocat");
  });
});
