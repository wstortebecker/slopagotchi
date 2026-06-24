import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { handleCronPoll } from "../../lib/api/cron";

// Hobby caps at 60; raise to 300 on Pro for deeper per-poll scoring.
export const maxDuration = 60;

/** GET /api/cron/poll — secured re-score of connected identities (cron + manual). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleCronPoll({
    authHeader: req.headers.authorization,
    schedule: (fn) => waitUntil(fn()),
  });
  return res.status(status).json(body);
}
