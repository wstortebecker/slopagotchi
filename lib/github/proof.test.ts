// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { verifyOwnership, VERIFICATION_GIST_FILENAME } from "./proof";
import type { GitHubClient, GitHubResponse } from "./client";

function jsonRes(status: number, body: unknown): GitHubResponse {
  return {
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
    json: async <T>() => body as T,
  };
}

/** Routes /users/{u} and /users/{u}/gists to canned responses. */
function fakeClient(opts: {
  bio?: string | null;
  gists?: unknown[];
  userStatus?: number;
  gistsStatus?: number;
  throws?: boolean;
}): GitHubClient {
  return {
    request: vi.fn(async (path: string) => {
      if (opts.throws) throw new Error("network down");
      if (path.includes("/gists")) {
        return jsonRes(opts.gistsStatus ?? 200, opts.gists ?? []);
      }
      return jsonRes(opts.userStatus ?? 200, { bio: opts.bio ?? null });
    }),
  } as unknown as GitHubClient;
}

const HANDLE = "alice.tngl.sh";
const DID = "did:plc:alice";

describe("verifyOwnership", () => {
  it("passes when the handle appears in the profile bio", async () => {
    const client = fakeClient({ bio: `slopgotchi: ${HANDLE}` });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(true);
  });

  it("passes when the DID appears in the profile bio (case-insensitive)", async () => {
    const client = fakeClient({ bio: `verifying ${DID.toUpperCase()}` });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(true);
  });

  it("passes when a named verification gist carries the identity in its description", async () => {
    const client = fakeClient({
      bio: null,
      gists: [
        {
          description: `slopgotchi verify ${DID}`,
          files: { [VERIFICATION_GIST_FILENAME]: { filename: VERIFICATION_GIST_FILENAME } },
        },
      ],
    });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(true);
  });

  it("passes via gist when the HANDLE (not DID) is the proof needle", async () => {
    const client = fakeClient({
      bio: null,
      gists: [
        {
          description: `slopgotchi verify ${HANDLE}`,
          files: { [VERIFICATION_GIST_FILENAME]: { filename: VERIFICATION_GIST_FILENAME } },
        },
      ],
    });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(true);
  });

  it("falls through to the gist check when /users returns non-200", async () => {
    const client = fakeClient({
      userStatus: 404,
      gists: [
        {
          description: DID,
          files: { [VERIFICATION_GIST_FILENAME]: { filename: VERIFICATION_GIST_FILENAME } },
        },
      ],
    });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(true);
  });

  it("does not false-positive on a handle that is only a substring of a larger word", async () => {
    // handle "al" must not match inside "alpha" — token-boundary matching (security hardening).
    const client = fakeClient({ bio: "alpha tester, beta builder", gists: [] });
    expect(await verifyOwnership("alice", { handle: "al", did: "did:plc:zzz" }, { client })).toBe(false);
  });

  it("fails when a gist has the identity but not the agreed filename", async () => {
    const client = fakeClient({
      bio: null,
      gists: [{ description: `${DID}`, files: { "notes.md": { filename: "notes.md" } } }],
    });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(false);
  });

  it("fails when neither bio nor gist proves ownership (AE1)", async () => {
    const client = fakeClient({ bio: "just a dev", gists: [] });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(false);
  });

  it("fails closed when there is no identity to match", async () => {
    const client = fakeClient({ bio: HANDLE });
    expect(await verifyOwnership("alice", {}, { client })).toBe(false);
  });

  it("fails closed on a network error (no false link)", async () => {
    const client = fakeClient({ throws: true });
    expect(await verifyOwnership("alice", { handle: HANDLE, did: DID }, { client })).toBe(false);
  });
});
