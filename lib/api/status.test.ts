// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", async (orig) => {
  const actual = await orig<typeof import("../store")>();
  return {
    normalizeHandle: actual.normalizeHandle,
    getDidForHandle: vi.fn(),
    getAccount: vi.fn(async () => ({ did: "did:plc:dev", handle: "alice", team: "acme" })),
    getBackfillStatus: vi.fn(),
    getDiagnostics: vi.fn(async () => []),
  };
});

import { handleStatus } from "./status";
import { getDidForHandle, getBackfillStatus } from "../store";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDidForHandle).mockResolvedValue("did:plc:dev");
});

describe("handleStatus", () => {
  it("404s for an unknown handle", async () => {
    vi.mocked(getDidForHandle).mockResolvedValue(null);
    const res = await handleStatus("ghost");
    expect(res.status).toBe(404);
    expect((res.body as { state: string }).state).toBe("unknown");
  });

  it("reports joining before the backfill flag is set", async () => {
    vi.mocked(getBackfillStatus).mockResolvedValue(null);
    const res = await handleStatus("alice");
    expect((res.body as { state: string }).state).toBe("joining");
  });

  it("reports backfilling while running", async () => {
    vi.mocked(getBackfillStatus).mockResolvedValue("running");
    const res = await handleStatus("alice");
    expect((res.body as { state: string }).state).toBe("backfilling");
  });

  it("reports done when the backfill finished", async () => {
    vi.mocked(getBackfillStatus).mockResolvedValue("done");
    const res = await handleStatus("alice");
    expect((res.body as { state: string }).state).toBe("done");
  });

  it("includes team + diagnostic count in the payload", async () => {
    vi.mocked(getBackfillStatus).mockResolvedValue("done");
    const res = await handleStatus("@Alice");
    expect(res.body).toMatchObject({ handle: "alice", team: "acme", diagnosticCount: 0 });
  });
});
