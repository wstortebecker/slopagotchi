// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../github/client", () => ({ isGithubConfigured: vi.fn(() => true) }));

vi.mock("../atproto/resolve", async (orig) => ({
  ...(await orig<typeof import("../atproto/resolve")>()),
  resolveIdentity: vi.fn(),
  resolveIdentityByDid: vi.fn(),
}));

vi.mock("../store", async (orig) => {
  const actual = await orig<typeof import("../store")>();
  return {
    normalizeHandle: actual.normalizeHandle, // keep real
    normalizeGithubUsername: actual.normalizeGithubUsername, // keep real
    rateLimitHit: vi.fn(async () => ({ allowed: true, count: 1 })),
    linkGithubUsername: vi.fn(async () => ({ ok: true, status: "linked" })),
  };
});

vi.mock("../github/proof", () => ({ verifyOwnership: vi.fn(async () => true) }));

vi.mock("../pipeline", () => ({ processGitHubSubject: vi.fn(async () => ({})) }));

import { handleGithubLink } from "./github-link";
import { isGithubConfigured } from "../github/client";
import { resolveIdentity, IdentityResolutionError } from "../atproto/resolve";
import { rateLimitHit, linkGithubUsername } from "../store";
import { verifyOwnership } from "../github/proof";
import { processGitHubSubject } from "../pipeline";

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
  vi.mocked(resolveIdentity).mockResolvedValue({
    did: "did:plc:dev",
    pds: "https://pds",
    handle: "alice.tngl.sh",
  });
  vi.mocked(verifyOwnership).mockResolvedValue(true);
  vi.mocked(linkGithubUsername).mockResolvedValue({ ok: true, status: "linked" });
});

describe("handleGithubLink", () => {
  it("links a proven username and kicks off a backfill (200)", async () => {
    const res = await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "octocat" }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, did: "did:plc:dev", githubUsername: "octocat" });
    expect(linkGithubUsername).toHaveBeenCalledWith("did:plc:dev", "octocat");
    expect(scheduled).toHaveLength(1);
  });

  it("runs the GitHub backfill via the scheduled task", async () => {
    await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "octocat" }));
    await scheduled[0]();
    expect(processGitHubSubject).toHaveBeenCalledWith(
      "did:plc:dev",
      "octocat",
      expect.objectContaining({ maxRounds: expect.any(Number) }),
    );
  });

  it("returns 403 and links nothing when ownership proof fails (R2)", async () => {
    vi.mocked(verifyOwnership).mockResolvedValue(false);
    const res = await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "octocat" }));
    expect(res.status).toBe(403);
    expect(linkGithubUsername).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });

  it("returns 409 when the username is already claimed by another DID (R11)", async () => {
    vi.mocked(linkGithubUsername).mockResolvedValue({
      ok: false,
      status: "claimed-by-other",
      existingDid: "did:plc:other",
    });
    const res = await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "octocat" }));
    expect(res.status).toBe(409);
    expect(scheduled).toHaveLength(0);
  });

  it("returns 400 for an unresolvable handle", async () => {
    vi.mocked(resolveIdentity).mockRejectedValue(
      new IdentityResolutionError("nope", "ghost.invalid"),
    );
    const res = await handleGithubLink(input({ handle: "ghost.invalid", githubUsername: "octocat" }));
    expect(res.status).toBe(400);
    expect(linkGithubUsername).not.toHaveBeenCalled();
  });

  it("rejects when neither handle nor did is given (400)", async () => {
    const res = await handleGithubLink(input({ githubUsername: "octocat" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid github username (400)", async () => {
    const res = await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "bad name!" }));
    expect(res.status).toBe(400);
  });

  it("returns 503 when GitHub is not configured", async () => {
    vi.mocked(isGithubConfigured).mockReturnValue(false);
    const res = await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "octocat" }));
    expect(res.status).toBe(503);
  });

  it("throttles repeated link attempts from one IP (429)", async () => {
    vi.mocked(rateLimitHit).mockResolvedValue({ allowed: false, count: 99 });
    const res = await handleGithubLink(input({ handle: "alice.tngl.sh", githubUsername: "octocat" }));
    expect(res.status).toBe(429);
    expect(linkGithubUsername).not.toHaveBeenCalled();
  });
});
