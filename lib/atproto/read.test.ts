// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { gzipSync } from "node:zlib";
import type { AtpAgent } from "@atproto/api";
import {
  cidFromBlob,
  decodePatchBytes,
  listPullRounds,
  fetchPatchText,
  enumerateDecodedRounds,
  createReadAgent,
  ReadError,
} from "./read";
import { resolveIdentity } from "./resolve";

const PATCH = `From abc Mon Sep 17 00:00:00 2001
From: Dev <dev@example.com>
Subject: [PATCH] do a thing

diff --git a/a.ts b/a.ts
`;

function blob(cid: string, mimeType = "application/gzip") {
  return { $type: "blob" as const, ref: { $link: cid }, mimeType, size: 100 };
}

/** Builds a fake AtpAgent whose listRecords/getBlob are vi mocks. */
function fakeAgent(opts: {
  pages?: { records: { uri: string; value: unknown }[]; cursor?: string }[];
  blob?: Uint8Array;
  listThrows?: boolean;
  blobThrows?: boolean;
}): AtpAgent {
  let call = 0;
  const pages = opts.pages ?? [];
  return {
    com: {
      atproto: {
        repo: {
          listRecords: vi.fn(async () => {
            if (opts.listThrows) throw new Error("network down");
            const page = pages[call] ?? { records: [], cursor: undefined };
            call += 1;
            return { data: page };
          }),
        },
        sync: {
          getBlob: vi.fn(async () => {
            if (opts.blobThrows) throw new Error("blob gone");
            return { data: opts.blob ?? new Uint8Array() };
          }),
        },
      },
    },
  } as unknown as AtpAgent;
}

describe("cidFromBlob", () => {
  it("reads a $link ref", () => {
    expect(cidFromBlob(blob("bafyA"))).toBe("bafyA");
  });
  it("reads a bare string ref", () => {
    expect(cidFromBlob({ ref: "bafyB" } as never)).toBe("bafyB");
  });
  it("reads a hydrated BlobRef whose ref stringifies to the CID", () => {
    const ref = { toString: () => "bafyC" };
    expect(cidFromBlob({ ref } as never)).toBe("bafyC");
  });
  it("returns null for a missing blob", () => {
    expect(cidFromBlob(undefined)).toBeNull();
    expect(cidFromBlob(null)).toBeNull();
  });
});

describe("decodePatchBytes", () => {
  it("gunzips a gzipped patch into git-format-patch text", () => {
    const text = decodePatchBytes(gzipSync(Buffer.from(PATCH)));
    expect(text).toContain("From ");
    expect(text).toContain("diff --git");
  });
  it("falls back to raw UTF-8 for non-gzipped bytes", () => {
    expect(decodePatchBytes(Buffer.from("plain text"))).toBe("plain text");
  });
});

describe("listPullRounds", () => {
  it("returns an empty list for a handle with zero pull records (AE1)", async () => {
    const agent = fakeAgent({ pages: [{ records: [], cursor: undefined }] });
    expect(await listPullRounds(agent, "did:plc:x")).toEqual([]);
  });

  it("flattens a single-round record with parsed target/source", async () => {
    const agent = fakeAgent({
      pages: [
        {
          records: [
            {
              uri: "at://did:plc:x/sh.tangled.repo.pull/r1",
              value: {
                $type: "sh.tangled.repo.pull",
                title: "fix thing",
                rounds: [{ createdAt: "2026-06-01T00:00:00Z", patchBlob: blob("bafy1") }],
                target: { repo: "did:plc:y", branch: "master" },
                source: { branch: "feat/x" },
              },
            },
          ],
        },
      ],
    });
    const rounds = await listPullRounds(agent, "did:plc:x");
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({
      prUri: "at://did:plc:x/sh.tangled.repo.pull/r1",
      roundIndex: 0,
      cid: "bafy1",
      title: "fix thing",
      target: { repo: "did:plc:y", branch: "master" },
      source: { branch: "feat/x" },
    });
  });

  it("enumerates each round with the correct roundIndex", async () => {
    const agent = fakeAgent({
      pages: [
        {
          records: [
            {
              uri: "at://did:plc:x/sh.tangled.repo.pull/r1",
              value: {
                rounds: [
                  { createdAt: "2026-06-01T00:00:00Z", patchBlob: blob("c0") },
                  { createdAt: "2026-06-02T00:00:00Z", patchBlob: blob("c1") },
                ],
              },
            },
          ],
        },
      ],
    });
    const rounds = await listPullRounds(agent, "did:plc:x");
    expect(rounds.map((r) => r.roundIndex)).toEqual([0, 1]);
    expect(rounds.map((r) => r.cid)).toEqual(["c0", "c1"]);
  });

  it("follows the cursor across pages (>100 pulls)", async () => {
    const mk = (id: string) => ({
      uri: `at://did:plc:x/sh.tangled.repo.pull/${id}`,
      value: { rounds: [{ createdAt: "2026-06-01T00:00:00Z", patchBlob: blob(id) }] },
    });
    const agent = fakeAgent({
      pages: [
        { records: [mk("a")], cursor: "c1" },
        { records: [mk("b")], cursor: "c2" },
        { records: [mk("c")], cursor: undefined },
      ],
    });
    const rounds = await listPullRounds(agent, "did:plc:x");
    expect(rounds.map((r) => r.cid)).toEqual(["a", "b", "c"]);
  });

  it("skips malformed records without crashing the batch", async () => {
    const agent = fakeAgent({
      pages: [
        {
          records: [
            { uri: "at://did:plc:x/sh.tangled.repo.pull/bad", value: { rounds: "nope" } },
            {
              uri: "at://did:plc:x/sh.tangled.repo.pull/ok",
              value: { rounds: [{ createdAt: "2026-06-01T00:00:00Z", patchBlob: blob("good") }] },
            },
          ],
        },
      ],
    });
    const rounds = await listPullRounds(agent, "did:plc:x");
    expect(rounds.map((r) => r.cid)).toEqual(["good"]);
  });

  it("wraps a listRecords failure in a typed ReadError", async () => {
    const agent = fakeAgent({ listThrows: true });
    await expect(listPullRounds(agent, "did:plc:x")).rejects.toBeInstanceOf(ReadError);
  });
});

describe("fetchPatchText", () => {
  it("decodes a gzipped blob to patch text", async () => {
    const agent = fakeAgent({ blob: gzipSync(Buffer.from(PATCH)) });
    const text = await fetchPatchText(agent, "did:plc:x", "bafy1");
    expect(text).toContain("diff --git");
  });
  it("wraps a getBlob failure in a typed ReadError", async () => {
    const agent = fakeAgent({ blobThrows: true });
    await expect(fetchPatchText(agent, "did:plc:x", "bafy1")).rejects.toBeInstanceOf(ReadError);
  });
});

// --- Live integration: the load-bearing U2 spike --------------------------
// Opt in with SLOPGOTCHI_LIVE=1 (needs network, no secrets). Skipped by default
// so the suite stays hermetic.
const live = process.env.SLOPGOTCHI_LIVE ? it : it.skip;

describe("read layer (live)", () => {
  live(
    "resolves a real public Tangled handle and decodes one round's patch",
    async () => {
      const { did, pds } = await resolveIdentity("oppi.li");
      expect(did).toMatch(/^did:/);
      const agent = createReadAgent(pds);
      const rounds = await listPullRounds(agent, did);
      expect(rounds.length).toBeGreaterThan(0);
      const withPatch = rounds.find((r) => r.cid);
      expect(withPatch).toBeDefined();
      const text = await fetchPatchText(agent, did, withPatch!.cid!);
      expect(text).toMatch(/^From |diff --git/m);
    },
    30_000,
  );

  live("enumerateDecodedRounds yields decoded patches", async () => {
    const seen: string[] = [];
    for await (const round of enumerateDecodedRounds(
      await resolveIdentity("oppi.li").then((r) => r.did),
    )) {
      seen.push(round.patchText);
      if (seen.length >= 1) break;
    }
    expect(seen[0]).toMatch(/^From |diff --git/m);
  }, 30_000);
});
