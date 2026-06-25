// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createGithubClient,
  isGithubConfigured,
  GitHubError,
  type GitHubResponse,
} from "./client";

/** Builds a fake fetch returning a sequence of canned responses. */
function fakeFetch(responses: GitHubResponse[]) {
  let i = 0;
  return vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockImplementation(
      async () => responses[Math.min(i++, responses.length - 1)] as unknown as Response,
    );
}

function res(status: number, headers: Record<string, string> = {}, body = ""): GitHubResponse {
  return {
    status,
    headers: new Headers(headers),
    text: async () => body,
    json: async <T>() => JSON.parse(body || "{}") as T,
  };
}

afterEach(() => {
  delete process.env.GITHUB_TOKEN;
});

describe("isGithubConfigured", () => {
  it("is false when GITHUB_TOKEN is unset", () => {
    expect(isGithubConfigured()).toBe(false);
  });
  it("is true when GITHUB_TOKEN is set", () => {
    process.env.GITHUB_TOKEN = "ghp_x";
    expect(isGithubConfigured()).toBe(true);
  });
});

describe("createGithubClient.request", () => {
  it("attaches the bearer token and api-version headers", async () => {
    const fetchImpl = fakeFetch([res(200, {}, "{}")]);
    const client = createGithubClient({ token: "tok", fetchImpl });
    await client.request("/repos/o/r/pulls/1");
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer tok");
    expect(headers["x-github-api-version"]).toBeDefined();
  });

  it("passes an abort signal so a slow response can't hang the function", async () => {
    const fetchImpl = fakeFetch([res(200, {}, "{}")]);
    const client = createGithubClient({ token: "tok", fetchImpl });
    await client.request("/x");
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses a custom Accept when provided", async () => {
    const fetchImpl = fakeFetch([res(200, {}, "patch")]);
    const client = createGithubClient({ token: "tok", fetchImpl });
    await client.request("/x", { accept: "application/vnd.github.patch" });
    const headers = (fetchImpl.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.accept).toBe("application/vnd.github.patch");
  });

  it("returns a 406 response without retrying (not a rate limit)", async () => {
    const fetchImpl = fakeFetch([res(406)]);
    const client = createGithubClient({ token: "tok", fetchImpl });
    const r = await client.request("/x");
    expect(r.status).toBe(406);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("honors retry-after on 429, backs off, then returns success", async () => {
    const fetchImpl = fakeFetch([
      res(429, { "retry-after": "2", "x-ratelimit-resource": "search" }),
      res(200, {}, "{}"),
    ]);
    const sleepImpl = vi.fn(async () => {});
    const client = createGithubClient({ token: "tok", fetchImpl, sleepImpl });
    const r = await client.request("/search/issues?q=x");
    expect(r.status).toBe(200);
    expect(sleepImpl).toHaveBeenCalledWith(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("aborts (throws) after maxRetries on a persistent 403", async () => {
    const fetchImpl = fakeFetch([
      res(403, { "retry-after": "1", "x-ratelimit-resource": "core" }),
    ]);
    const sleepImpl = vi.fn(async () => {});
    const client = createGithubClient({ token: "tok", fetchImpl, sleepImpl, maxRetries: 2 });
    await expect(client.request("/x")).rejects.toBeInstanceOf(GitHubError);
    // 3 fetches (initial + 2 retries), then abort — no tight loop.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("aborts immediately when a primary-limit reset exceeds the backoff cap", async () => {
    const fetchImpl = fakeFetch([
      res(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "9999999999" }),
    ]);
    const sleepImpl = vi.fn(async () => {});
    const client = createGithubClient({ token: "tok", fetchImpl, sleepImpl });
    await expect(client.request("/x")).rejects.toBeInstanceOf(GitHubError);
    expect(sleepImpl).not.toHaveBeenCalled();
  });
});
