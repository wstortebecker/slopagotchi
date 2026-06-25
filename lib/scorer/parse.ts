import { SlopScoreSchema, type SlopScore } from "../types.js";

/**
 * Turn raw model text into a validated {@link SlopScore}.
 * Strips markdown fences, extracts the first balanced JSON object, parses, and
 * validates with Zod. Pure and network-free; the retry loop lives in the
 * scorer, which feeds {@link ParseError.message} back to the model.
 */

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/** Removes leading/trailing markdown code fences if present. */
export function stripFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i;
  const m = trimmed.match(fence);
  return (m ? m[1] : trimmed).trim();
}

/**
 * Extracts the first balanced `{...}` object from text, respecting strings and
 * escapes so braces inside string literals don't unbalance the scan.
 */
export function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new ParseError("No JSON object found in model output");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new ParseError("Unbalanced JSON object in model output");
}

/** Parses + validates model text into a SlopScore, or throws ParseError. */
export function parseScore(text: string): SlopScore {
  const json = extractFirstJsonObject(stripFences(text));
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch (err) {
    throw new ParseError(`JSON.parse failed: ${(err as Error).message}`);
  }
  const result = SlopScoreSchema.safeParse(obj);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ParseError(`Schema validation failed: ${issues}`);
  }
  return result.data;
}
