// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PetStateRecord } from "../types";

vi.mock("../store", () => ({
  isStoreConfigured: vi.fn(() => true),
  getTeamAccounts: vi.fn(async () => []),
  getCachedPetState: vi.fn(async () => null),
}));
vi.mock("../atproto/service", () => ({
  fetchPetState: vi.fn(async () => null),
}));

import { handleZoo, type ZooDTO } from "./zoo";
import { isStoreConfigured, getTeamAccounts, getCachedPetState } from "../store";
import { fetchPetState } from "../atproto/service";

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
  vi.mocked(isStoreConfigured).mockReturnValue(true);
  vi.mocked(getTeamAccounts).mockResolvedValue([]);
  vi.mocked(getCachedPetState).mockResolvedValue(null);
  vi.mocked(fetchPetState).mockResolvedValue(null);
});

describe("handleZoo", () => {
  it("returns configured:false with no members when the store is unwired", async () => {
    vi.mocked(isStoreConfigured).mockReturnValue(false);
    const res = await handleZoo("Acme");
    expect(res.status).toBe(200);
    const body = res.body as ZooDTO;
    expect(body).toMatchObject({ team: "acme", configured: false, members: [] });
    expect(getTeamAccounts).not.toHaveBeenCalled();
  });

  it("returns members sorted by handle, cache-first", async () => {
    vi.mocked(getTeamAccounts).mockResolvedValue([
      { did: "did:plc:b", handle: "bob", team: "acme" },
      { did: "did:plc:a", handle: "alice", team: "acme" },
    ]);
    vi.mocked(getCachedPetState).mockImplementation(async (did: string) =>
      did === "did:plc:a" ? petRecord({ subject: "did:plc:a", handle: "alice" }) : null,
    );
    const res = await handleZoo("acme");
    const body = res.body as ZooDTO;
    expect(body.configured).toBe(true);
    expect(body.members.map((m) => m.handle)).toEqual(["alice", "bob"]);
    expect(body.members[0].pet?.health).toBe(88);
    // bob had no cache → fell back to the public record (mocked null).
    expect(fetchPetState).toHaveBeenCalledWith("did:plc:b");
  });

  it("tolerates a service read failure for one member (pet:null)", async () => {
    vi.mocked(getTeamAccounts).mockResolvedValue([
      { did: "did:plc:a", handle: "alice", team: "acme" },
    ]);
    vi.mocked(fetchPetState).mockRejectedValue(new Error("not configured"));
    const res = await handleZoo("acme");
    const body = res.body as ZooDTO;
    expect(body.members).toEqual([{ handle: "alice", pet: null }]);
  });
});
