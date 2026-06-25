import { describe, it, expect } from "vitest";
import {
  isDroppablePath,
  splitDiffSections,
  prefilterDiff,
  truncateToBudget,
  prepareDiff,
} from "./diff";

const PREAMBLE = `From abc Mon Sep 17 00:00:00 2001
From: Dev <dev@example.com>
Subject: [PATCH] change

`;

function fileSection(path: string, bodyLines = 3): string {
  const body = Array.from({ length: bodyLines }, (_, i) => `+line ${i}`).join("\n");
  return `diff --git a/${path} b/${path}
index 111..222 100644
--- a/${path}
+++ b/${path}
@@ -1,0 +1,${bodyLines} @@
${body}`;
}

describe("isDroppablePath", () => {
  it("drops lockfiles and generated/vendored paths", () => {
    expect(isDroppablePath("package-lock.json")).toBe(true);
    expect(isDroppablePath("app/flake.lock")).toBe(true);
    expect(isDroppablePath("dist/bundle.js")).toBe(true);
    expect(isDroppablePath("vendor/lib/x.go")).toBe(true);
    expect(isDroppablePath("a.min.js")).toBe(true);
  });
  it("keeps normal source files", () => {
    expect(isDroppablePath("src/index.ts")).toBe(false);
    expect(isDroppablePath("lib/health.ts")).toBe(false);
  });
});

describe("splitDiffSections", () => {
  it("separates preamble from per-file sections", () => {
    const diff = PREAMBLE + fileSection("a.ts") + "\n" + fileSection("b.ts");
    const { preamble, files } = splitDiffSections(diff);
    expect(preamble).toContain("Subject:");
    expect(files.map((f) => f.path)).toEqual(["a.ts", "b.ts"]);
  });
});

describe("prefilterDiff", () => {
  it("drops package-lock.json before measuring, keeps source", () => {
    const diff =
      PREAMBLE + fileSection("package-lock.json", 200) + "\n" + fileSection("src/x.ts");
    const { text, droppedFiles } = prefilterDiff(diff);
    expect(droppedFiles).toContain("package-lock.json");
    expect(text).toContain("src/x.ts");
    expect(text).not.toContain("package-lock.json");
  });
});

describe("truncateToBudget", () => {
  it("returns input unchanged when under budget", () => {
    const diff = PREAMBLE + fileSection("a.ts");
    expect(truncateToBudget(diff, 100_000)).toEqual({ text: diff, truncated: false });
  });

  it("truncates an over-budget diff, preserving paths/@@ headers and marking truncation", () => {
    const big = PREAMBLE + fileSection("huge.ts", 5000) + "\n" + fileSection("small.ts", 2);
    const { text, truncated } = truncateToBudget(big, 2000);
    expect(truncated).toBe(true);
    expect(text).toContain("diff --git a/huge.ts");
    expect(text).toMatch(/@@/);
    expect(text).toMatch(/truncated|omitted/);
    expect(text.length).toBeLessThan(big.length);
  });
});

describe("prepareDiff", () => {
  it("pre-filters then truncates, reporting both", () => {
    const diff =
      PREAMBLE +
      fileSection("yarn.lock", 100) +
      "\n" +
      fileSection("src/big.ts", 5000) +
      "\n" +
      fileSection("src/small.ts", 2);
    const out = prepareDiff(diff, 2000);
    expect(out.droppedFiles).toContain("yarn.lock");
    expect(out.truncated).toBe(true);
    expect(out.text).not.toContain("yarn.lock");
    expect(out.text.length).toBeLessThanOrEqual(2200);
    expect(out.text).toContain("src/big.ts");
  });

  it("leaves a small clean diff intact", () => {
    const diff = PREAMBLE + fileSection("src/x.ts");
    const out = prepareDiff(diff);
    expect(out.truncated).toBe(false);
    expect(out.droppedFiles).toEqual([]);
    expect(out.text).toContain("src/x.ts");
  });
});
