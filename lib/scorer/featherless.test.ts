// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import type OpenAI from "openai";
import { scorePatch, ScorerError, isScorerConfigured } from "./featherless";

const VALID = JSON.stringify({
  score: 12,
  verdict: "clean",
  categories: {
    scopeDiscipline: 3,
    specificity: 2,
    dependencyRestraint: 2,
    testThoughtfulness: 3,
    maintainability: 2,
  },
  reasons: ["focused"],
  medicine: [],
  confidence: "high",
});

const PATCH = `From abc Mon Sep 17 00:00:00 2001
Subject: [PATCH] tidy

diff --git a/a.ts b/a.ts
@@ -1 +1 @@
-old
+new
`;

/** Fake OpenAI client returning queued contents in order. */
function fakeClient(contents: string[]): {
  client: OpenAI;
  create: ReturnType<typeof vi.fn>;
} {
  let i = 0;
  const create = vi.fn(async () => ({
    choices: [{ message: { content: contents[i++] ?? "" } }],
  }));
  const client = {
    chat: { completions: { create } },
  } as unknown as OpenAI;
  return { client, create };
}

describe("scorePatch", () => {
  it("returns a validated score with provenance on a valid first response", async () => {
    const { client, create } = fakeClient([VALID]);
    const result = await scorePatch(PATCH, { client, model: "test-model", seed: 5 });
    expect(result.score.verdict).toBe("clean");
    expect(result.provenance).toEqual({
      model: "test-model",
      seed: 5,
      rulesetVersion: "v1",
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first response is invalid JSON, accepting the second", async () => {
    const { client, create } = fakeClient(["not json at all", VALID]);
    const result = await scorePatch(PATCH, { client });
    expect(result.score.verdict).toBe("clean");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("retries when the first response violates the schema", async () => {
    const bad = JSON.stringify({ score: 999, verdict: "nope" });
    const { client, create } = fakeClient([bad, VALID]);
    const result = await scorePatch(PATCH, { client });
    expect(result.score.score).toBe(12);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("throws a typed ScorerError when both attempts fail", async () => {
    const { client, create } = fakeClient(["garbage", "still garbage"]);
    await expect(scorePatch(PATCH, { client })).rejects.toBeInstanceOf(ScorerError);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

// --- Live: real Featherless inference -------------------------------------
const live = process.env.SLOPGOTCHI_LIVE && isScorerConfigured() ? it : it.skip;

const CLEAN_PATCH = `From abc Mon Sep 17 00:00:00 2001
Subject: [PATCH] add nullish guard with test

diff --git a/src/util.ts b/src/util.ts
@@ -1,3 +1,6 @@
 export function head<T>(xs: T[]): T | undefined {
-  return xs[0];
+  if (!xs || xs.length === 0) return undefined;
+  return xs[0];
 }
diff --git a/src/util.test.ts b/src/util.test.ts
@@ -0,0 +1,5 @@
+import { head } from "./util";
+test("empty", () => expect(head([])).toBeUndefined());
+test("first", () => expect(head([1, 2])).toBe(1));
`;

const SLOPPY_PATCH = `From def Mon Sep 17 00:00:00 2001
Subject: [PATCH] stuff

diff --git a/src/everything.ts b/src/everything.ts
@@ -1,2 +1,40 @@
+import _ from "lodash";
+import moment from "moment";
+// rewrote the whole module, also reformatted unrelated files
+export class MegaManager {
+  doEverything(a: any): any { return _.cloneDeep(a); }
+  // ... 30 more lines of unused helpers, no tests, new heavy deps
+}
diff --git a/README.md b/README.md
@@ -1 +1,5 @@
-# proj
+# proj (reformatted for no reason)
`;

describe("scorePatch (live)", () => {
  live(
    "scores a clean patch low and a sloppy patch high, on opposite bands",
    async () => {
      const clean = await scorePatch(CLEAN_PATCH, { title: "add guard" });
      const sloppy = await scorePatch(SLOPPY_PATCH, { title: "stuff" });
      expect(clean.score.score).toBeLessThan(sloppy.score.score);
      expect(clean.score.reasons.length).toBeGreaterThan(0);
      expect(sloppy.score.reasons.length).toBeGreaterThan(0);
    },
    60_000,
  );

  live(
    "is band-stable: the same patch scored twice maps to the same verdict",
    async () => {
      const a = await scorePatch(CLEAN_PATCH, { title: "add guard" });
      const b = await scorePatch(CLEAN_PATCH, { title: "add guard" });
      expect(a.score.verdict).toBe(b.score.verdict);
    },
    60_000,
  );
});
