// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PetStateRecord } from "../types";

vi.mock("../atproto/service", () => ({
  listAllPetStates: vi.fn(async () => []),
}));

import { handleScoreboard, rankScore, type ScoreboardDTO } from "./scoreboard";
import { listAllPetStates } from "../atproto/service";

function petRecord(over: Partial<PetStateRecord> = {}): PetStateRecord {
  return {
    $type: "app.slopgotchi.pet.state",
    subject: "did:plc:a",
    handle: "alice",
    health: 88,
    band: "sharp",
    state: "active",
    diagnosticCount: 3,
    updatedAt: "2026-06-25T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAllPetStates).mockResolvedValue([]);
});

describe("handleScoreboard", () => {
  it("returns developers ranked by health, healthiest first", async () => {
    vi.mocked(listAllPetStates).mockResolvedValue([
      petRecord({ subject: "did:plc:a", handle: "alice", health: 40 }),
      petRecord({ subject: "did:plc:b", handle: "bob", health: 90 }),
      petRecord({ subject: "github:carol", handle: undefined, health: 65 }),
    ]);
    const res = await handleScoreboard();
    expect(res.status).toBe(200);
    const body = res.body as ScoreboardDTO;
    expect(body.configured).toBe(true);
    expect(body.developers.map((d) => d.health)).toEqual([90, 65, 40]);
  });

  it("does not let a no-diagnoses (health-100) dev outrank a well-scored one", async () => {
    vi.mocked(listAllPetStates).mockResolvedValue([
      // Perfect health, but zero scored PRs — should not top the board.
      petRecord({ subject: "did:plc:idle", handle: "idle", health: 100, band: null, state: "no-diagnoses", diagnosticCount: 0 }),
      // Slightly lower health, but proven over many PRs.
      petRecord({ subject: "did:plc:proven", handle: "proven", health: 80, diagnosticCount: 20 }),
    ]);
    const body = (await handleScoreboard()).body as ScoreboardDTO;
    expect(body.developers.map((d) => d.handle)).toEqual(["proven", "idle"]);
  });

  it("ranks a high-PR dev above a single-PR dev at equal health", async () => {
    vi.mocked(listAllPetStates).mockResolvedValue([
      petRecord({ subject: "did:plc:few", handle: "few", health: 90, diagnosticCount: 1 }),
      petRecord({ subject: "did:plc:many", handle: "many", health: 90, diagnosticCount: 30 }),
    ]);
    const body = (await handleScoreboard()).body as ScoreboardDTO;
    expect(body.developers.map((d) => d.handle)).toEqual(["many", "few"]);
  });

  it("rankScore is the baseline at zero PRs and converges to health with many", () => {
    expect(rankScore({ health: 100, diagnosticCount: 0 })).toBe(50);
    expect(rankScore({ health: 90, diagnosticCount: 1000 })).toBeCloseTo(89.8, 1);
  });

  it("breaks health ties by diagnostic count, then identity", async () => {
    vi.mocked(listAllPetStates).mockResolvedValue([
      petRecord({ subject: "did:plc:a", handle: "alice", health: 70, diagnosticCount: 2 }),
      petRecord({ subject: "did:plc:b", handle: "bob", health: 70, diagnosticCount: 9 }),
    ]);
    const body = (await handleScoreboard()).body as ScoreboardDTO;
    expect(body.developers.map((d) => d.handle)).toEqual(["bob", "alice"]);
  });

  it("returns configured:true with an empty roster when no records exist", async () => {
    const body = (await handleScoreboard()).body as ScoreboardDTO;
    expect(body).toEqual({ configured: true, developers: [] });
  });

  it("degrades to configured:false when the service read fails", async () => {
    vi.mocked(listAllPetStates).mockRejectedValue(new Error("SLOPGOTCHI_IDENTIFIER is not set"));
    const res = await handleScoreboard();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ configured: false, developers: [] });
  });
});
