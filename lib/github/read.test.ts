// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { listAuthoredPrRefs, fetchPrDiff } from "./read";
import { GitHubError, type GitHubClient, type GitHubResponse } from "./client";

function jsonRes(status: number, body: unknown): GitHubResponse {
  return {
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
    json: async <T>() => body as T,
  };
}
function textRes(status: number, body = ""): GitHubResponse {
  return {
    status,
    headers: new Headers(),
    text: async () => body,
    json: async <T>() => JSON.parse(body || "{}") as T,
  };
}

function searchItem(n: number, owner = "o", repo = "r") {
  return {
    number: n,
    title: `PR ${n}`,
    html_url: `https://github.com/${owner}/${repo}/pull/${n}`,
    repository_url: `https://api.github.com/repos/${owner}/${repo}`,
    created_at: `2026-06-${String(n % 28 + 1).padStart(2, "0")}T00:00:00Z`,
    pull_request: {},
  };
}

/** A fake client routing by path + accept, with a recorded call log. */
function fakeClient(
  handler: (path: string, accept?: string) => GitHubResponse,
): { client: GitHubClient; request: ReturnType<typeof vi.fn> } {
  const request = vi.fn(async (path: string, opts?: { accept?: string }) =>
    handler(path, opts?.accept),
  );
  return { client: { request } as unknown as GitHubClient, request };
}

describe("listAuthoredPrRefs", () => {
  it("returns newest-first refs with headSha/prUrl/title (happy path)", async () => {
    const { client, request } = fakeClient((path) => {
      if (path.startsWith("/search/issues")) {
        return jsonRes(200, { total_count: 2, incomplete_results: false, items: [searchItem(2), searchItem(1)] });
      }
      const m = path.match(/\/pulls\/(\d+)$/)!;
      return jsonRes(200, { head: { sha: `sha${m[1]}` }, title: `Pull ${m[1]}` });
    });
    const refs = await listAuthoredPrRefs("alice", { window: 50, client });
    expect(refs).toHaveLength(2);
    expect(refs[0]).toMatchObject({
      source: "github",
      owner: "o",
      repo: "r",
      prNumber: 2,
      headSha: "sha2",
      prUrl: "https://github.com/o/r/pull/2",
      title: "Pull 2",
    });
    // 1 search call + 2 pulls calls.
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("caps at the window and paginates a second search page (window cap)", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => searchItem(200 - i));
    const page2 = Array.from({ length: 100 }, (_, i) => searchItem(100 - i));
    const { client, request } = fakeClient((path) => {
      if (path.includes("page=1")) {
        return jsonRes(200, { total_count: 200, incomplete_results: false, items: page1 });
      }
      if (path.includes("page=2")) {
        return jsonRes(200, { total_count: 200, incomplete_results: false, items: page2 });
      }
      const m = path.match(/\/pulls\/(\d+)$/)!;
      return jsonRes(200, { head: { sha: `sha${m[1]}` } });
    });
    const refs = await listAuthoredPrRefs("alice", { window: 150, client });
    expect(refs).toHaveLength(150);
    const searchCalls = request.mock.calls.filter((c) => String(c[0]).startsWith("/search"));
    expect(searchCalls.some((c) => String(c[0]).includes("page=2"))).toBe(true);
  });

  it("skips a candidate whose pull lookup 404s without crashing the batch", async () => {
    const { client } = fakeClient((path) => {
      if (path.startsWith("/search/issues")) {
        return jsonRes(200, { total_count: 2, incomplete_results: false, items: [searchItem(2), searchItem(1)] });
      }
      if (path.endsWith("/pulls/1")) return jsonRes(404, { message: "Not Found" });
      const m = path.match(/\/pulls\/(\d+)$/)!;
      return jsonRes(200, { head: { sha: `sha${m[1]}` } });
    });
    const refs = await listAuthoredPrRefs("alice", { client });
    expect(refs.map((r) => r.prNumber)).toEqual([2]);
  });

  it("throws a GitHubError when search itself fails", async () => {
    const { client } = fakeClient(() => jsonRes(422, { message: "bad query" }));
    await expect(listAuthoredPrRefs("alice", { client })).rejects.toBeInstanceOf(GitHubError);
  });

  it("silently excludes a candidate whose repository_url is unparseable", async () => {
    const good = searchItem(2);
    const bad = { ...searchItem(1), repository_url: "https://api.github.com/not-a-repo-url" };
    const { client } = fakeClient((path) => {
      if (path.startsWith("/search/issues")) {
        return jsonRes(200, { total_count: 2, incomplete_results: false, items: [good, bad] });
      }
      const m = path.match(/\/pulls\/(\d+)$/)!;
      return jsonRes(200, { head: { sha: `sha${m[1]}` } });
    });
    const refs = await listAuthoredPrRefs("alice", { client });
    expect(refs.map((r) => r.prNumber)).toEqual([2]);
  });
});

describe("fetchPrDiff", () => {
  it("returns the patch text on 200", async () => {
    const { client } = fakeClient((_, accept) => {
      expect(accept).toBe("application/vnd.github.patch");
      return textRes(200, "diff --git a/a.ts b/a.ts\n");
    });
    const diff = await fetchPrDiff("o", "r", 5, { client });
    expect(diff).toContain("diff --git");
  });

  it("returns null on a 406 over-large diff (permanent skip)", async () => {
    const { client } = fakeClient(() => textRes(406));
    expect(await fetchPrDiff("o", "r", 5, { client })).toBeNull();
  });

  it("throws on a non-200/406 status (transient)", async () => {
    const { client } = fakeClient(() => textRes(500));
    await expect(fetchPrDiff("o", "r", 5, { client })).rejects.toBeInstanceOf(GitHubError);
  });
});

// --- Live integration (opt-in): needs a real GITHUB_TOKEN ------------------
const live = process.env.GITHUB_TOKEN && process.env.SLOPGOTCHI_LIVE ? it : it.skip;
describe("github read (live)", () => {
  live("lists a real public author's PRs and fetches one diff", async () => {
    const refs = await listAuthoredPrRefs("torvalds", { window: 3 });
    expect(refs.length).toBeGreaterThan(0);
    const r = refs[0];
    const diff = await fetchPrDiff(r.owner, r.repo, r.prNumber);
    expect(diff === null || /diff --git|^From /m.test(diff)).toBe(true);
  }, 30_000);
});
