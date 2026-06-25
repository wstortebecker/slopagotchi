import { getGithubClient, type GitHubClient } from "./client.js";

/**
 * Ownership proof (KTD6, R2): the developer's ATProto handle or DID must be
 * discoverable on the public GitHub account via a no-OAuth mechanism — either
 *  (a) the profile bio (`GET /users/{username}`), or
 *  (b) a public gist named {@link VERIFICATION_GIST_FILENAME} whose description
 *      carries the handle or DID (`GET /users/{username}/gists`).
 * Both are single unauthenticated reads. Proof fails closed: any network error
 * yields `false`, so a transient GitHub blip simply defers scoring to the next
 * pass (idempotent) rather than minting an unproven link.
 */

/** The agreed gist filename a developer creates to prove ownership (Open Question resolved). */
export const VERIFICATION_GIST_FILENAME = "slopgotchi-verify.md";

interface UserResponse {
  bio?: string | null;
}

interface GistResponse {
  description?: string | null;
  files?: Record<string, { filename?: string } | null>;
}

/** Identity strings that, if present, prove the GitHub account belongs to the developer. */
function proofNeedles(identity: { handle?: string; did?: string }): string[] {
  const out: string[] = [];
  if (identity.handle) out.push(identity.handle.replace(/^@/, "").toLowerCase());
  if (identity.did) out.push(identity.did.toLowerCase());
  return out.filter(Boolean);
}

/**
 * Whether `needle` appears in `hay` delimited by non-alphanumeric boundaries —
 * a token match, not a bare substring. This stops a short handle from
 * incidentally matching inside an unrelated word (e.g. "al" inside "alpha") and
 * raises the bar on spoofing via a longer string that merely contains the needle.
 */
function containsNeedle(hay: string, needle: string): boolean {
  if (!needle) return false;
  let from = 0;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i === -1) return false;
    const before = i === 0 ? "" : hay[i - 1];
    const after = i + needle.length >= hay.length ? "" : hay[i + needle.length];
    const isBoundary = (c: string) => c === "" || !/[a-z0-9]/i.test(c);
    if (isBoundary(before) && isBoundary(after)) return true;
    from = i + 1;
  }
}

function bioProves(bio: string | null | undefined, needles: string[]): boolean {
  if (!bio) return false;
  const hay = bio.toLowerCase();
  return needles.some((n) => containsNeedle(hay, n));
}

function gistsProve(gists: GistResponse[], needles: string[]): boolean {
  return gists.some((g) => {
    const named = Object.keys(g.files ?? {}).some(
      (fn) => fn.toLowerCase() === VERIFICATION_GIST_FILENAME,
    );
    if (!named) return false;
    const desc = (g.description ?? "").toLowerCase();
    return needles.some((n) => containsNeedle(desc, n));
  });
}

export interface VerifyOptions {
  client?: GitHubClient;
}

/**
 * Returns whether `githubUsername` has publicly proven it belongs to the given
 * developer identity. Checks the profile bio first (cheapest), then the
 * verification gist. Never throws — returns `false` on any error.
 */
export async function verifyOwnership(
  githubUsername: string,
  identity: { handle?: string; did?: string },
  opts: VerifyOptions = {},
): Promise<boolean> {
  const needles = proofNeedles(identity);
  if (needles.length === 0) return false;
  const client = opts.client ?? getGithubClient();

  try {
    const userRes = await client.request(`/users/${githubUsername}`);
    if (userRes.status === 200) {
      const user = await userRes.json<UserResponse>();
      if (bioProves(user.bio, needles)) return true;
    }

    const gistRes = await client.request(`/users/${githubUsername}/gists?per_page=100`);
    if (gistRes.status === 200) {
      const gists = await gistRes.json<GistResponse[]>();
      if (gistsProve(gists, needles)) return true;
    }
  } catch (err) {
    console.warn(
      `github: proof check for ${githubUsername} errored (failing closed):`,
      (err as Error).message,
    );
    return false;
  }

  return false;
}
