// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory Redis backing the mock, exercising real SETNX/HSET semantics so the
// first-prover-wins guard and account-field write are tested without secrets.
const backing = vi.hoisted(() => ({ map: new Map<string, unknown>() }));

vi.mock("@upstash/redis", () => {
  class Redis {
    async set(key: string, val: unknown, opts?: { nx?: boolean; ex?: number }) {
      if (opts?.nx && backing.map.has(key)) return null;
      backing.map.set(key, val);
      return "OK";
    }
    async get(key: string) {
      return backing.map.get(key) ?? null;
    }
    async del(key: string) {
      backing.map.delete(key);
    }
    async hset(key: string, obj: Record<string, unknown>) {
      const cur = (backing.map.get(key) as Record<string, unknown>) ?? {};
      backing.map.set(key, { ...cur, ...obj });
    }
    async hgetall(key: string) {
      return (backing.map.get(key) as Record<string, unknown>) ?? null;
    }
    async sadd(key: string, ...members: string[]) {
      const set = (backing.map.get(key) as Set<string>) ?? new Set<string>();
      members.forEach((m) => set.add(m));
      backing.map.set(key, set);
    }
    async srem(key: string, ...members: string[]) {
      const set = (backing.map.get(key) as Set<string>) ?? new Set<string>();
      members.forEach((m) => set.delete(m));
      backing.map.set(key, set);
    }
    async smembers(key: string) {
      return Array.from((backing.map.get(key) as Set<string>) ?? []);
    }
  }
  return { Redis };
});

// Make isStoreConfigured() true so getRedis() constructs the mocked client.
process.env.UPSTASH_REDIS_REST_URL = "https://fake";
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

import {
  linkGithubUsername,
  getDidForGithub,
  getAccount,
  registerAccount,
  normalizeGithubUsername,
  claimRound,
  markRoundDone,
  registerStandaloneGithub,
  getStandaloneGithubUsers,
  unregisterStandaloneGithub,
} from "./store";

beforeEach(() => backing.map.clear());

describe("normalizeGithubUsername", () => {
  it("lowercases and strips a leading @", () => {
    expect(normalizeGithubUsername("@Alice")).toBe("alice");
    expect(normalizeGithubUsername(" Bob ")).toBe("bob");
  });
  it("strips the @ even when the input has leading whitespace (trim-before-strip)", () => {
    expect(normalizeGithubUsername(" @Alice ")).toBe("alice");
  });
});

describe("linkGithubUsername (R1, R11)", () => {
  it("round-trips a link and surfaces github on the account", async () => {
    await registerAccount("acme", "did:plc:dev", "dev.tngl.sh");
    const r = await linkGithubUsername("did:plc:dev", "Octocat");
    expect(r).toEqual({ ok: true, status: "linked" });
    expect(await getDidForGithub("octocat")).toBe("did:plc:dev");
    expect((await getAccount("did:plc:dev"))?.github).toBe("octocat");
  });

  it("rejects a second DID claiming an already-proven username (collision)", async () => {
    await linkGithubUsername("did:plc:first", "octocat");
    const r = await linkGithubUsername("did:plc:second", "Octocat");
    expect(r).toEqual({ ok: false, status: "claimed-by-other", existingDid: "did:plc:first" });
    // Original mapping is unchanged.
    expect(await getDidForGithub("octocat")).toBe("did:plc:first");
  });

  it("treats the same DID re-linking the same username as idempotent", async () => {
    await linkGithubUsername("did:plc:dev", "octocat");
    const r = await linkGithubUsername("did:plc:dev", "OctoCat");
    expect(r).toEqual({ ok: true, status: "already-linked" });
  });
});

describe("standalone GitHub registry (unify going forward)", () => {
  it("registers and lists standalone usernames, normalized and idempotent", async () => {
    await registerStandaloneGithub("Octocat");
    await registerStandaloneGithub("octocat"); // same after normalization
    await registerStandaloneGithub("hubot");
    const users = await getStandaloneGithubUsers();
    expect(users.sort()).toEqual(["hubot", "octocat"]);
  });

  it("unregisters a standalone username", async () => {
    await registerStandaloneGithub("octocat");
    await unregisterStandaloneGithub("OctoCat");
    expect(await getStandaloneGithubUsers()).toEqual([]);
  });

  it("linking a standalone username drops it from the standalone poll set", async () => {
    await registerStandaloneGithub("octocat");
    const r = await linkGithubUsername("did:plc:dev", "Octocat");
    expect(r).toEqual({ ok: true, status: "linked" });
    expect(await getStandaloneGithubUsers()).toEqual([]); // no longer polled standalone
  });

  it("a rejected (collision) link leaves the standalone set untouched", async () => {
    await linkGithubUsername("did:plc:first", "octocat");
    await registerStandaloneGithub("octocat");
    const r = await linkGithubUsername("did:plc:second", "octocat");
    expect(r.ok).toBe(false);
    expect(await getStandaloneGithubUsers()).toEqual(["octocat"]); // still standalone
  });
});

describe("synthetic GitHub claim reuses the round machinery (R6, KTD1)", () => {
  it("a re-claim at the same head SHA is a no-op; a new head SHA is distinct", async () => {
    expect(await claimRound("github:o/r#5@abc", 0)).toBe(true);
    expect(await claimRound("github:o/r#5@abc", 0)).toBe(false); // same head: already claimed
    expect(await claimRound("github:o/r#5@def", 0)).toBe(true); // new head: distinct claim
  });

  it("a done-marked claim stays claimed (not re-scored)", async () => {
    await claimRound("github:o/r#7@sha", 0);
    await markRoundDone("github:o/r#7@sha", 0);
    expect(await claimRound("github:o/r#7@sha", 0)).toBe(false);
  });
});
