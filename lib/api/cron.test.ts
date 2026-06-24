// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getConnectedDids: vi.fn(),
  setBackfillStatus: vi.fn(async () => {}),
}));
vi.mock("../pipeline", () => ({
  processSubject: vi.fn(async () => ({ processed: 0 })),
}));

import { handleCronPoll } from "./cron";
import { getConnectedDids } from "../store";
import { processSubject } from "../pipeline";

const SECRET = "test-cron-secret";

let scheduled: Array<() => Promise<void>>;
const schedule = (fn: () => Promise<void>) => {
  scheduled.push(fn);
};

beforeEach(() => {
  vi.clearAllMocks();
  scheduled = [];
  process.env.CRON_SECRET = SECRET;
  vi.mocked(getConnectedDids).mockResolvedValue([]);
  vi.mocked(processSubject).mockResolvedValue({
    did: "x",
    processed: 0,
    skipped: 0,
    failed: 0,
    petUpdated: false,
  });
});

describe("handleCronPoll", () => {
  it("401s when the bearer token is missing", async () => {
    const res = await handleCronPoll({ authHeader: undefined, schedule });
    expect(res.status).toBe(401);
    expect(processSubject).not.toHaveBeenCalled();
  });

  it("401s when the bearer token is wrong (same length)", async () => {
    const wrong = `Bearer ${"x".repeat(SECRET.length)}`;
    const res = await handleCronPoll({ authHeader: wrong, schedule });
    expect(res.status).toBe(401);
  });

  it("401s when the token length differs (no throw)", async () => {
    const res = await handleCronPoll({ authHeader: "Bearer short", schedule });
    expect(res.status).toBe(401);
  });

  it("200 no-op with a valid token and no connected accounts", async () => {
    const res = await handleCronPoll({ authHeader: `Bearer ${SECRET}`, schedule });
    expect(res.status).toBe(200);
    expect((res.body as { processed: number }).processed).toBe(0);
    expect(processSubject).not.toHaveBeenCalled();
  });

  it("processes each connected DID with a valid token", async () => {
    vi.mocked(getConnectedDids).mockResolvedValue(["did:plc:a", "did:plc:b"]);
    const res = await handleCronPoll({ authHeader: `Bearer ${SECRET}`, schedule });
    expect(res.status).toBe(200);
    expect(processSubject).toHaveBeenCalledTimes(2);
    expect(processSubject).toHaveBeenCalledWith("did:plc:a", expect.any(Object));
    expect(processSubject).toHaveBeenCalledWith("did:plc:b", expect.any(Object));
  });

  it("caps total rounds scored per invocation across DIDs", async () => {
    process.env.CRON_MAX_ROUNDS = "1";
    try {
      vi.mocked(processSubject).mockResolvedValue({
        did: "x",
        processed: 1,
        skipped: 0,
        failed: 0,
        petUpdated: true,
      });
      vi.mocked(getConnectedDids).mockResolvedValue(["did:plc:a", "did:plc:b", "did:plc:c"]);
      const res = await handleCronPoll({ authHeader: `Bearer ${SECRET}`, schedule });
      const data = res.body as { scored: number };
      // budget of 1 is spent by the first DID; the rest wait for the next poll.
      expect(processSubject).toHaveBeenCalledTimes(1);
      expect(data.scored).toBe(1);
    } finally {
      delete process.env.CRON_MAX_ROUNDS;
    }
  });

  it("honors the per-invocation cap and defers the rest", async () => {
    process.env.CRON_MAX_DIDS = "2";
    try {
      vi.mocked(getConnectedDids).mockResolvedValue(["did:plc:a", "did:plc:b", "did:plc:c"]);
      const res = await handleCronPoll({ authHeader: `Bearer ${SECRET}`, schedule });
      const data = res.body as { processed: number; deferred: number };
      expect(data.processed).toBe(2);
      expect(data.deferred).toBe(1);
      expect(processSubject).toHaveBeenCalledTimes(2); // synchronous batch only
      expect(scheduled).toHaveLength(1); // tail deferred
    } finally {
      delete process.env.CRON_MAX_DIDS;
    }
  });
});
