/**
 * Diff preparation for scoring: drop generated/lockfile/vendored noise, then
 * hard-truncate to the model's context budget (KTD7). A char-count heuristic
 * (~4 chars/token) sizes the budget; the optional `/v1/tokenize` refinement is
 * deferred — the heuristic is the fallback the plan relies on. Per-file
 * map-reduce aggregation is also deferred.
 */

/**
 * ~8K tokens × ~4 chars/token. Enough context for accurate slop signals (scope,
 * tests, bloat) while keeping per-score latency low on shared infra.
 */
export const CONTEXT_CHAR_BUDGET = 32_000;

const DROP_PATTERNS: RegExp[] = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)npm-shrinkwrap\.json$/,
  /(^|\/)composer\.lock$/,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)Gemfile\.lock$/,
  /(^|\/)go\.sum$/,
  /(^|\/)flake\.lock$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /(^|\/)(dist|build|out|vendor|node_modules)\//,
  /\.snap$/,
  /\.lock$/,
  /(^|\/)__generated__\//,
  /\.generated\./,
];

export interface FileSection {
  path: string;
  text: string;
}

export interface PreparedDiff {
  text: string;
  droppedFiles: string[];
  truncated: boolean;
}

/** Returns true if a file path is generated/lockfile/vendored noise. */
export function isDroppablePath(path: string): boolean {
  return DROP_PATTERNS.some((re) => re.test(path));
}

function parseFilePath(section: string): string {
  const m = section.match(/^diff --git a\/(.+?) b\/(.+?)\s*$/m);
  return m ? m[2] : "";
}

/** Splits a git-format-patch into its preamble and per-file sections. */
export function splitDiffSections(patchText: string): {
  preamble: string;
  files: FileSection[];
} {
  const idx = patchText.indexOf("diff --git ");
  if (idx === -1) return { preamble: patchText, files: [] };
  const preamble = patchText.slice(0, idx);
  const rest = patchText.slice(idx);
  const parts = rest.split(/\n(?=diff --git )/);
  return {
    preamble,
    files: parts.map((text) => ({ path: parseFilePath(text), text })),
  };
}

/** Drops noise files; returns the filtered diff and the dropped paths. */
export function prefilterDiff(patchText: string): {
  text: string;
  droppedFiles: string[];
} {
  const { preamble, files } = splitDiffSections(patchText);
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const f of files) {
    if (f.path && isDroppablePath(f.path)) dropped.push(f.path);
    else kept.push(f.text);
  }
  const text = [preamble.trimEnd(), ...kept].filter(Boolean).join("\n");
  return { text, droppedFiles: dropped };
}

/** Keeps only structural lines of a file section (paths + @@ headers), dropping hunk bodies. */
function headerOnly(section: string): string {
  const keep = section
    .split("\n")
    .filter((l) =>
      /^(diff --git |index |--- |\+\+\+ |@@|new file|deleted file|old mode|new mode|rename |copy |similarity |dissimilarity |Binary )/.test(
        l,
      ),
    );
  return `${keep.join("\n")}\n... [hunk body truncated to fit context budget] ...`;
}

/**
 * Truncates a diff to the char budget, preserving file paths and `@@` headers
 * and marking truncated regions. Whole files are kept while they fit; the first
 * over-budget file degrades to header-only; the rest are summarised by count.
 */
export function truncateToBudget(
  text: string,
  budget = CONTEXT_CHAR_BUDGET,
): { text: string; truncated: boolean } {
  if (text.length <= budget) return { text, truncated: false };

  const { preamble, files } = splitDiffSections(text);
  let out = preamble.trimEnd();
  let omitted = 0;

  for (const f of files) {
    if (`${out}\n${f.text}`.length <= budget) {
      out = `${out}\n${f.text}`;
      continue;
    }
    const ho = headerOnly(f.text);
    if (`${out}\n${ho}`.length <= budget) {
      out = `${out}\n${ho}`;
    } else {
      omitted += 1;
    }
  }

  if (omitted > 0) {
    out += `\n... [${omitted} more file(s) omitted to fit context budget] ...`;
  }
  return { text: out.trimStart(), truncated: true };
}

/** Full preparation: pre-filter noise, then truncate to budget. */
export function prepareDiff(
  patchText: string,
  budget = CONTEXT_CHAR_BUDGET,
): PreparedDiff {
  const { text, droppedFiles } = prefilterDiff(patchText);
  const { text: finalText, truncated } = truncateToBudget(text, budget);
  return { text: finalText, droppedFiles, truncated };
}
