import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { handleGithubStandalone } from "../../lib/api/github-standalone.js";
import { clientIpFromHeader } from "../../lib/api/http.js";

// Node runtime is the default; raise the budget so the waitUntil backfill has
// room. Hobby caps at 60; raise to 300 on Pro.
export const maxDuration = 60;

/** POST /api/github/standalone — score a public GitHub user's PRs (no atproto account). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = body ? JSON.parse(body) : {};
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = clientIpFromHeader(Array.isArray(forwarded) ? forwarded[0] : forwarded);

  const { status, body: out } = await handleGithubStandalone({
    body,
    ip,
    schedule: (fn) => waitUntil(fn()),
  });
  return res.status(status).json(out);
}
