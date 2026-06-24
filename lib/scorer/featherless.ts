import OpenAI from "openai";
import { prepareDiff } from "./diff";
import {
  SYSTEM_PROMPT,
  RULESET_VERSION,
  buildUserPrompt,
  buildRetryPrompt,
} from "./prompt";
import { parseScore, ParseError } from "./parse";
import type { ScoredPatch } from "../types";

/**
 * The Featherless slop scorer. Uses the OpenAI SDK pointed at Featherless with
 * deterministic-ish settings (temp 0, fixed seed). JSON reliability comes from
 * the prompt + Zod + a single retry (KTD5), not from `response_format` — which
 * is sent unconditionally but only honoured if supported.
 */

export class ScorerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScorerError";
  }
}

export const SCORER_SEED = 1729;
export const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";
// Qwen2.5-Coder-32B is the ideal scorer but is frequently capacity-queued on
// shared Featherless infra (10s–50s, often 503), which doesn't fit a 60s
// serverless budget. Qwen2.5-7B-Instruct is available, ~10s, and emits clean
// JSON (Qwen3 models leak <think> blocks). Override with FEATHERLESS_MODEL.
export const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

/**
 * Per-request timeout (ms). Featherless queues a busy model and can hang for
 * ~45s before returning a 503, so an unbounded request would blow the 60s Hobby
 * function budget. We abort well before that; the round is released and retried
 * on the next poll. We do NOT retry slow capacity errors in-call — retrying a
 * hanging request just multiplies the hang.
 */
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * 429 "Concurrency limit exceeded" fails *fast* (≈0.7s) and just means too many
 * in-flight requests right now (overlapping invocations). Unlike a slow 503,
 * a brief retry is cheap and recovers concurrency contention in-invocation.
 */
const RATE_RETRY_BACKOFF_MS = [400, 1200, 3000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  return (err as { status?: number }).status === 429;
}

export function getModel(): string {
  return process.env.FEATHERLESS_MODEL || DEFAULT_MODEL;
}

export function isScorerConfigured(): boolean {
  return Boolean(process.env.FEATHERLESS_API_KEY);
}

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!isScorerConfigured()) {
    throw new ScorerError("FEATHERLESS_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.FEATHERLESS_API_KEY!,
      baseURL: FEATHERLESS_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0, // don't let the SDK multiply a hanging request
    });
  }
  return client;
}

export interface ScoreOptions {
  title?: string;
  /** Inject a client for testing; defaults to the Featherless client. */
  client?: OpenAI;
  model?: string;
  seed?: number;
}

async function callModel(
  openai: OpenAI,
  model: string,
  seed: number,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  // Fail fast on capacity/timeout (slow 503/abort) so we don't blow the function
  // budget — the pipeline releases the round and the next poll retries. But a
  // fast 429 (concurrency contention) gets a few short retries.
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0,
        top_p: 1,
        seed,
        max_tokens: 1024,
        // Sent unconditionally; silently ignored by Featherless if unsupported.
        response_format: { type: "json_object" },
      });
      return res.choices[0]?.message?.content ?? "";
    } catch (err) {
      if (isRateLimit(err) && attempt < RATE_RETRY_BACKOFF_MS.length) {
        await sleep(RATE_RETRY_BACKOFF_MS[attempt]);
        continue;
      }
      throw new ScorerError(`Featherless request failed: ${(err as Error).message}`);
    }
  }
}

/**
 * Scores a patch into a validated {@link ScoredPatch}. Prepares the diff, calls
 * the model, validates, and retries exactly once with the parser error fed back.
 * Throws {@link ScorerError} if both attempts fail (callers skip without
 * crashing the batch).
 */
export async function scorePatch(
  patchText: string,
  opts: ScoreOptions = {},
): Promise<ScoredPatch> {
  const openai = opts.client ?? getClient();
  const model = opts.model ?? getModel();
  const seed = opts.seed ?? SCORER_SEED;
  const prepared = prepareDiff(patchText);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(prepared.text, opts.title) },
  ];

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callModel(openai, model, seed, messages);
    try {
      const score = parseScore(raw);
      return {
        score,
        provenance: { model, seed, rulesetVersion: RULESET_VERSION },
      };
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
      lastError = err;
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: buildRetryPrompt(err.message) });
    }
  }

  throw new ScorerError(
    `Failed to obtain a valid score after retry: ${lastError?.message}`,
  );
}
