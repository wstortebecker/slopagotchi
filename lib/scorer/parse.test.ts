import { describe, it, expect } from "vitest";
import {
  stripFences,
  extractFirstJsonObject,
  parseScore,
  ParseError,
} from "./parse";

const VALID = {
  score: 12,
  verdict: "clean",
  categories: {
    scopeDiscipline: 3,
    specificity: 2,
    dependencyRestraint: 2,
    testThoughtfulness: 3,
    maintainability: 2,
  },
  reasons: ["focused change", "has tests"],
  medicine: [],
  confidence: "high",
};

describe("stripFences", () => {
  it("removes ```json fences", () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("removes bare ``` fences", () => {
    expect(stripFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("leaves unfenced text untouched", () => {
    expect(stripFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe("extractFirstJsonObject", () => {
  it("extracts an object embedded in prose", () => {
    expect(extractFirstJsonObject('Here it is: {"a":1} done')).toBe('{"a":1}');
  });
  it("respects braces inside string literals", () => {
    const s = '{"msg":"a } b","n":1}';
    expect(extractFirstJsonObject(s)).toBe(s);
  });
  it("respects escaped quotes", () => {
    const s = '{"msg":"she said \\"hi\\"","n":1}';
    expect(extractFirstJsonObject(s)).toBe(s);
  });
  it("throws ParseError when no object present", () => {
    expect(() => extractFirstJsonObject("no json here")).toThrow(ParseError);
  });
});

describe("parseScore", () => {
  it("parses a clean valid score", () => {
    expect(parseScore(JSON.stringify(VALID))).toMatchObject({
      score: 12,
      verdict: "clean",
    });
  });

  it("parses markdown-fenced JSON (malformed output recovery)", () => {
    expect(parseScore("```json\n" + JSON.stringify(VALID) + "\n```")).toMatchObject({
      verdict: "clean",
    });
  });

  it("rejects an out-of-range score (Zod)", () => {
    expect(() => parseScore(JSON.stringify({ ...VALID, score: 150 }))).toThrow(
      ParseError,
    );
  });

  it("rejects a missing field (Zod)", () => {
    const { confidence: _omit, ...missing } = VALID;
    void _omit;
    expect(() => parseScore(JSON.stringify(missing))).toThrow(ParseError);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseScore("{not valid json")).toThrow(ParseError);
  });
});
