// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PetStateRecord } from "../types";

vi.mock("../atproto/service", () => ({
  listAllPetStates: vi.fn(async () => []),
}));

import { handleScoreboard, type ScoreboardDTO } from "./scoreboard";
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
