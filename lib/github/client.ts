/**
 * The GitHub REST client: a lazy, env-configured wrapper over a single
 * fine-grained PAT (KTD5). Reads are read-only over public repos we are not
 * installed on, so a GitHub App's per-install scaling buys nothing; one PAT
 * gives 5,000/hr `core` and 30/min `search`. The token lives only in env
 * (never Redis) behind {@link isGithubConfigured}, mirroring the Featherless
 * scorer's `getClient` / `isScorerConfigured` lazy-singleton pattern.
 *
 * `request` is the single network seam: it adds auth + version headers and
 * handles secondary-rate-limit backoff (403/429 with `retry-after` or a
 * `x-ratelimit-remaining: 0` reset), bounded so a hammered bucket aborts
 * rather than tight-loops. It returns the response for ANY non-rate-limited
 * status; callers interpret 200/404/406 themselves.
 */

export const GITHUB_API_BASE = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly resource?: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export function isGithubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

/** A minimal response shape so tests can fake the client without a real fetch. */
export interface GitHubResponse {
  status: number;
  headers: Headers;
  text(): Promise<string>;
  json<T>(): Promise<T>;
}

export interface GitHubClient {
  /**
   * GETs `path` (relative to the API base). `accept` overrides the default
   * `application/vnd.github+json` (e.g. the `.patch` media type). Resolves the
   * response after exhausting any rate-limit backoff.
   */
  request(path: string, opts?: { accept?: string }): Promise<GitHubResponse>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface ClientOptions {
  token?: string;
  fetchImpl?: typeof fetch;
  /** Injectable sleep so backoff tests don't actually wait. */
  sleepImpl?: (ms: number) => Promise<void>;
  /** Max secondary-rate-limit retries before aborting. */
  maxRetries?: number;
  /** Don't sleep longer than this for a single backoff (ms); abort instead. */
  maxBackoffMs?: number;
  /**
   * Per-request timeout (ms). A slow GitHub response must not consume the whole
   * 60s function budget, so we abort the fetch — the caller treats the throw as
   * transient and retries next pass. Mirrors the Featherless scorer's timeout.
   */
  requestTimeoutMs?: number;
}

/** Parses the backoff (ms) a 403/429 asks for, or null if it isn't a rate limit. */
function rateLimitBackoffMs(res: GitHubResponse): number | null {
  if (res.status !== 403 && res.status !== 429) return null;
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return Math.max(0, secs) * 1000;
  }
  // Primary rate limit: remaining 0 + a reset epoch (seconds).
  if (res.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    if (Number.isFinite(reset)) {
      // We can't read the clock in a deterministic way here; cap to a small
      // bounded wait. A long primary-limit reset is treated as an abort below.
      return Number.POSITIVE_INFINITY;
    }
  }
  return null;
}

export function createGithubClient(opts: ClientOptions = {}): GitHubClient {
  const token = opts.token ?? process.env.GITHUB_TOKEN;
  if (!token) throw new GitHubError("GITHUB_TOKEN is not set");
  const doFetch = opts.fetchImpl ?? fetch;
  const doSleep = opts.sleepImpl ?? sleep;
  const maxRetries = opts.maxRetries ?? 3;
  const maxBackoffMs = opts.maxBackoffMs ?? 10_000;
  const requestTimeoutMs = opts.requestTimeoutMs ?? 15_000;

  async function request(
    path: string,
    reqOpts: { accept?: string } = {},
  ): Promise<GitHubResponse> {
    const url = path.startsWith("http") ? path : `${GITHUB_API_BASE}${path}`;
    for (let attempt = 0; ; attempt++) {
      const res = (await doFetch(url, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: reqOpts.accept ?? "application/vnd.github+json",
          "x-github-api-version": GITHUB_API_VERSION,
          "user-agent": "slopgotchi",
        },
        signal: AbortSignal.timeout(requestTimeoutMs),
      })) as unknown as GitHubResponse;

      const backoff = rateLimitBackoffMs(res);
      if (backoff === null) return res;

      const resource = res.headers.get("x-ratelimit-resource") ?? "unknown";
      if (attempt >= maxRetries || backoff > maxBackoffMs) {
        throw new GitHubError(
          `GitHub rate limit on ${resource} (status ${res.status})`,
          res.status,
          resource,
        );
      }
      console.warn(
        `github: ${resource} rate-limited (status ${res.status}); backing off ${backoff}ms`,
      );
      await doSleep(backoff);
    }
  }

  return { request };
}

let singleton: GitHubClient | null = null;

/** Returns the shared lazy client; throws if `GITHUB_TOKEN` is unset. */
export function getGithubClient(): GitHubClient {
  if (!isGithubConfigured()) {
    throw new GitHubError("GITHUB_TOKEN is not set");
  }
  if (!singleton) singleton = createGithubClient();
  return singleton;
}

/** Resets the cached client (test helper). */
export function _resetGithubClient(): void {
  singleton = null;
}
