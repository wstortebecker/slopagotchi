// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../github/client", () => ({ isGithubConfigured: vi.fn(() => true) }));

vi.mock("../store", async (orig) => {
  const actual = await orig<typeof import("../store")>();
  return {
    normalizeGithubUsername: actual.normalizeGithubUsername, // keep real
    rateLimitHit: vi.fn(async () => ({ allowed: true, count: 1 })),
    registerStandaloneGithub: vi.fn(async () => {}),
    getDidForGithub: vi.fn(async () => null),
  };
});

vi.mock("../pipeline", () => ({ processStandaloneGitHub: vi.fn(async () => ({})) }));

import { handleGithubStandalone } from "./github-standalone";
import { isGithubConfigured } from "../github/client";
import { rateLimitHit, registerStandaloneGithub, getDidForGithub } from "../store";
import { processStandaloneGitHub } from "../pipeline";

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
  vi.mocked(isGithubConfigured).mockReturnValue(true);
  vi.mocked(rateLimitHit).mockResolvedValue({ allowed: true, count: 1 });
  vi.mocked(getDidForGithub).mockResolvedValue(null);
});

describe("handleGithubStandalone", () => {
  it("registers a standalone username and kicks off a backfill (200)", async () => {
    const res = await handleGithubStandalone(input({ githubUsername: "OctoCat" }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      subject: "github:octocat",
      githubUsername: "octocat",
      state: "backfilling",
    });
    expect(registerStandaloneGithub).toHaveBeenCalledWith("octocat");
    expect(scheduled).toHaveLength(1);
  });

  it("runs the backfill via the scheduled task with a round budget", async () => {
    await handleGithubStandalone(input({ githubUsername: "octocat" }));
    await scheduled[0]();
    expect(processStandaloneGitHub).toHaveBeenCalledWith(
      "octocat",
      expect.objectContaining({ maxRounds: expect.any(Number) }),
    );
  });

  it("points at the linked DID's pet instead of forking when already linked", async () => {
    vi.mocked(getDidForGithub).mockResolvedValue("did:plc:owner");
    const res = await handleGithubStandalone(input({ githubUsername: "octocat" }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subject: "did:plc:owner", linked: true, state: "linked" });
    expect(registerStandaloneGithub).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });

  it("returns 503 when GitHub is not configured", async () => {
    vi.mocked(isGithubConfigured).mockReturnValue(false);
    const res = await handleGithubStandalone(input({ githubUsername: "octocat" }));
    expect(res.status).toBe(503);
  });

  it("rejects an invalid username (400)", async () => {
    const res = await handleGithubStandalone(input({ githubUsername: "not a username!" }));
    expect(res.status).toBe(400);
    expect(registerStandaloneGithub).not.toHaveBeenCalled();
  });

  it("throttles repeated attempts from one IP (429)", async () => {
    vi.mocked(rateLimitHit).mockResolvedValue({ allowed: false, count: 99 });
    const res = await handleGithubStandalone(input({ githubUsername: "octocat" }));
    expect(res.status).toBe(429);
    expect(registerStandaloneGithub).not.toHaveBeenCalled();
  });
});
