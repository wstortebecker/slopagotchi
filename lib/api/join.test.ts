// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../atproto/resolve", async (orig) => ({
  ...(await orig<typeof import("../atproto/resolve")>()),
  resolveIdentity: vi.fn(),
}));

vi.mock("../store", async (orig) => {
  const actual = await orig<typeof import("../store")>();
  return {
    normalizeHandle: actual.normalizeHandle, // keep real
    registerAccount: vi.fn(async () => {}),
    getDiagnostics: vi.fn(async () => []),
    getBackfillStatus: vi.fn(async () => null),
    setBackfillStatus: vi.fn(async () => {}),
    rateLimitHit: vi.fn(async () => ({ allowed: true, count: 1 })),
    cachePetState: vi.fn(async () => {}),
  };
});

vi.mock("../atproto/write", () => ({
  getServiceAgent: vi.fn(async () => ({ agent: {}, did: "did:plc:service" })),
  putPetState: vi.fn(async () => ({ uri: "at://pet", cid: "c", rkey: "r" })),
  buildPetStateRecord: vi.fn((x) => x),
}));

vi.mock("../pipeline", () => ({ processSubject: vi.fn(async () => ({})) }));

import { handleJoin } from "./join";
import { resolveIdentity, IdentityResolutionError } from "../atproto/resolve";
import { registerAccount, getBackfillStatus, rateLimitHit } from "../store";
import { processSubject } from "../pipeline";

// A schedule spy that captures the backfill callback instead of running it.
let scheduled: Array<() => Promise<void>>;
const schedule = (fn: () => Promise<void>) => {
  scheduled.push(fn);
};

function input(body: unknown, ip = "1.2.3.4") {
  return { body, ip, schedule };
}

beforeEach(() => {
  vi.clearAllMocks();
  scheduled = [];
  vi.mocked(resolveIdentity).mockResolvedValue({
    did: "did:plc:dev",
    pds: "https://pds",
    handle: "alice.tngl.sh",
  });
  vi.mocked(rateLimitHit).mockResolvedValue({ allowed: true, count: 1 });
  vi.mocked(getBackfillStatus).mockResolvedValue(null);
});

describe("handleJoin", () => {
  it("registers a resolved handle and kicks off a bounded backfill (200)", async () => {
    const res = await handleJoin(input({ handle: "alice.tngl.sh", team: "acme" }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, did: "did:plc:dev", team: "acme" });
    expect(registerAccount).toHaveBeenCalledWith("acme", "did:plc:dev", "alice.tngl.sh");
    expect(scheduled).toHaveLength(1);
  });

  it("bounds backfill by MAX_BACKFILL_ROUNDS when the task runs", async () => {
    await handleJoin(input({ handle: "alice.tngl.sh", team: "acme" }));
    await scheduled[0](); // run the captured backfill task
    expect(processSubject).toHaveBeenCalledWith(
      "did:plc:dev",
      expect.objectContaining({ maxRounds: expect.any(Number) }),
    );
  });

  it("returns 400 and registers nothing for an unresolvable handle", async () => {
    vi.mocked(resolveIdentity).mockRejectedValue(
      new IdentityResolutionError("nope", "ghost.invalid"),
    );
    const res = await handleJoin(input({ handle: "ghost.invalid", team: "acme" }));
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/couldn't resolve/i);
    expect(registerAccount).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });

  it("does not start a second backfill when one is already running (idempotent)", async () => {
    vi.mocked(getBackfillStatus).mockResolvedValue("running");
    const res = await handleJoin(input({ handle: "alice.tngl.sh", team: "acme" }));
    expect(res.status).toBe(200);
    expect(registerAccount).toHaveBeenCalledTimes(1);
    expect(scheduled).toHaveLength(0);
  });

  it("throttles repeated joins from one IP (429)", async () => {
    vi.mocked(rateLimitHit).mockResolvedValue({ allowed: false, count: 99 });
    const res = await handleJoin(input({ handle: "alice.tngl.sh", team: "acme" }));
    expect(res.status).toBe(429);
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("rejects a missing handle (400)", async () => {
    const res = await handleJoin(input({ team: "acme" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid team slug (400)", async () => {
    const res = await handleJoin(input({ handle: "alice.tngl.sh", team: "Bad Team!" }));
    expect(res.status).toBe(400);
  });

  it("registers teamlessly (personal roster) when no team is given (200)", async () => {
    const res = await handleJoin(input({ handle: "alice.tngl.sh" }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, did: "did:plc:dev", team: "" });
    expect(registerAccount).toHaveBeenCalledWith("", "did:plc:dev", "alice.tngl.sh");
    expect(scheduled).toHaveLength(1);
  });
});
