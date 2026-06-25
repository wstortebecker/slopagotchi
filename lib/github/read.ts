import { getGithubClient, GitHubError, type GitHubClient } from "./client.js";
import { mapWithConcurrency } from "../concurrency.js";
import type { GitHubPrRef } from "../types.js";

/**
 * The GitHub read layer, mirroring the Tangled `read.ts` two-phase split
 * (`listPullRounds` + `fetchPatchText`): list a user's authored public PRs as
 * claimable refs first, fetch each PR's diff only after the pipeline has
 * claimed it. Search returns PR identity but NOT `head.sha`, so the list phase
 * pairs each search hit with a lightweight `GET /pulls/{n}` to read the head
 * SHA and title (KTD4).
 */

const SEARCH_PAGE_SIZE = 100; // GitHub max per_page
// Concurrent head.sha lookups in phase 1b; well under GitHub's 100 ceiling so a
// 30-PR window resolves in ~6 waves instead of 30 serial round-trips.
const HEAD_SHA_CONCURRENCY = 5;

interface SearchItem {
  number: number;
  title?: string;
  html_url: string;
  repository_url: string; // https://api.github.com/repos/{owner}/{repo}
  created_at: string;
  pull_request?: unknown;
}

interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchItem[];
}

interface PullResponse {
  head?: { sha?: string };
  title?: string;
}

/** Parses `owner`/`repo` out of a search item's `repository_url`. */
function ownerRepoFromUrl(repositoryUrl: string): { owner: string; repo: string } | null {
  const m = repositoryUrl.match(/\/repos\/([^/]+)\/([^/]+)\/?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export interface ListOptions {
  /** Cap on the most-recent PRs returned (recency window, R7). */
  window?: number;
  client?: GitHubClient;
}

/**
 * Lists a user's authored public PRs as claimable refs, newest-first, bounded
 * to the recency `window`. Search is paginated newest-first; for each hit a
 * `GET /pulls/{n}` resolves `head.sha`. Note GitHub Search caps results at
 * 1,000 — fine here because `window` is far smaller; deeper backfill (date
 * windowing) is deferred.
 */
export async function listAuthoredPrRefs(
  username: string,
  opts: ListOptions = {},
): Promise<GitHubPrRef[]> {
  const client = opts.client ?? getGithubClient();
  const window = opts.window ?? 50;
  const q = encodeURIComponent(`is:pr author:${username}`);

  // Phase 1a: enumerate search hits (identity only), newest-first, up to window.
  const items: SearchItem[] = [];
  const maxPages = Math.ceil(window / SEARCH_PAGE_SIZE);
  for (let page = 1; page <= maxPages; page++) {
    const res = await client.request(
      `/search/issues?q=${q}&sort=created&order=desc&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    );
    if (res.status !== 200) {
      throw new GitHubError(
        `search/issues failed for ${username}: status ${res.status}`,
        res.status,
        "search",
      );
    }
    const data = await res.json<SearchResponse>();
    const prs = data.items.filter((i) => i.pull_request);
    items.push(...prs);
    if (prs.length < SEARCH_PAGE_SIZE) break; // last page
    if (items.length >= window) break;
  }
  const candidates = items.slice(0, window);

  // Phase 1b: resolve head.sha + title per candidate concurrently (bounded), the
  // `core` bucket. Sequential round-trips here would dominate the 60s budget.
  const resolved = await mapWithConcurrency(
    candidates,
    HEAD_SHA_CONCURRENCY,
    async (item): Promise<GitHubPrRef | null> => {
      const loc = ownerRepoFromUrl(item.repository_url);
      if (!loc) return null; // unparseable repo URL: skip rather than crash the batch
      const res = await client.request(`/repos/${loc.owner}/${loc.repo}/pulls/${item.number}`);
      if (res.status !== 200) {
        // Deleted/transferred PR or transient miss: skip this one, keep the batch.
        console.warn(
          `github: pulls/${loc.owner}/${loc.repo}/${item.number} returned ${res.status}; skipping`,
        );
        return null;
      }
      const pull = await res.json<PullResponse>();
      const headSha = pull.head?.sha;
      if (!headSha) return null; // no head SHA: nothing stable to claim
      return {
        source: "github",
        owner: loc.owner,
        repo: loc.repo,
        prNumber: item.number,
        headSha,
        prUrl: item.html_url,
        title: pull.title ?? item.title,
        createdAt: item.created_at,
      };
    },
  );

  // Order preserved by mapWithConcurrency; drop skipped (null) candidates.
  return resolved.filter((r): r is GitHubPrRef => r !== null);
}

/**
 * Fetches a PR's diff as git-format-patch text (`.patch` media type — directly
 * compatible with the scorer's `diff --git` prefiltering). Returns `null` to
 * signal a permanent SKIP on 406 (diff exceeds GitHub's 300 files / 20k lines /
 * ~1 MB limit) so the caller consumes the claim rather than re-attempting it
 * forever; the `/files` fallback is deferred. Throws {@link GitHubError} on any
 * other non-200, which the caller treats as transient (release + retry).
 */
export async function fetchPrDiff(
  owner: string,
  repo: string,
  prNumber: number,
  opts: { client?: GitHubClient } = {},
): Promise<string | null> {
  const client = opts.client ?? getGithubClient();
  const res = await client.request(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
    accept: "application/vnd.github.patch",
  });
  if (res.status === 200) return res.text();
  if (res.status === 406) {
    console.warn(
      `github: diff for ${owner}/${repo}#${prNumber} too large (406); skipping`,
    );
    return null;
  }
  throw new GitHubError(
    `fetchPrDiff failed for ${owner}/${repo}#${prNumber}: status ${res.status}`,
    res.status,
    "core",
  );
}
