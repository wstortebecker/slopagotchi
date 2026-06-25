import { SLOP_CATEGORIES } from "../types.js";

/**
 * The rubric system prompt + the inlined JSON schema. Because Featherless does
 * not document `response_format`/JSON-schema enforcement, the schema lives in
 * the prompt and is the contract the parser/validator enforces (KTD5).
 */

/** Bump when the rubric or schema changes; recorded as provenance on diagnostics. */
export const RULESET_VERSION = "v1";

const RUBRIC = SLOP_CATEGORIES.map(
  (c) => `- ${c.label} (0–${c.weight}): ${categoryGuidance(c.key)}`,
).join("\n");

function categoryGuidance(key: string): string {
  switch (key) {
    case "scopeDiscipline":
      return "Does the change stay within a coherent, stated scope, or does it sprawl into unrelated edits, drive-by refactors, and reformatting noise?";
    case "specificity":
      return "Is the change purposeful and intent-revealing, or vague, boilerplate-ish, and copy-pasted without adapting to context?";
    case "dependencyRestraint":
      return "Does it avoid pulling in unnecessary dependencies, reinventing stdlib, or adding heavy packages for trivial needs?";
    case "testThoughtfulness":
      return "Are tests present, meaningful, and covering real behavior and edge cases — not absent, trivial, or asserting nothing?";
    case "maintainability":
      return "Is the code clear, appropriately factored, and free of dead code, needless abstraction, and obvious bloat?";
    default:
      return "";
  }
}

export const SYSTEM_PROMPT = `You are Slopgotchi, an automated code-slop assessor for git pull requests.

"Slop" means CARELESSNESS: overbuild, scope sprawl, weak or missing tests, needless dependencies, and unmaintainable bloat. You are NOT detecting whether AI wrote the code, and you are NOT a merge gate — you produce an accountability signal, not a verdict on authorship. Judge the patch as submitted on its own merits.

You are given a git-format-patch (a unified diff, possibly truncated with explicit markers). Score it against this rubric. Each category is measured in SLOP POINTS: 0 means no slop in that dimension; the max means maximally sloppy. The categories sum to roughly the overall score.

${RUBRIC}

Overall: \`score\` is 0–100 (higher = more slop) and should approximate the sum of the category points. Map \`verdict\` from the score: clean (0–20), minor (21–45), sloppy (46–70), severe (71–100).

Output ONLY a single JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "score": <integer 0-100>,
  "verdict": "clean" | "minor" | "sloppy" | "severe",
  "categories": {
    "scopeDiscipline": <number 0-25>,
    "specificity": <number 0-20>,
    "dependencyRestraint": <number 0-20>,
    "testThoughtfulness": <number 0-20>,
    "maintainability": <number 0-15>
  },
  "reasons": [<one or more short strings explaining the score>],
  "medicine": [<concrete suggested fixes; may be empty for a clean patch>],
  "confidence": "low" | "medium" | "high"
}

Be concise. A clean, focused, well-tested small change should score low with verdict "clean".`;

/** Builds the user message carrying the (already prepared) diff. */
export function buildUserPrompt(patchText: string, title?: string): string {
  const header = title ? `Pull request title: ${title}\n\n` : "";
  return `${header}Score this patch:\n\n${patchText}`;
}

/** Appends the prior parser/validator error so the retry can correct itself. */
export function buildRetryPrompt(error: string): string {
  return `Your previous response could not be parsed/validated: ${error}\n\nReturn ONLY the corrected JSON object, matching the schema exactly. No prose, no markdown.`;
}
