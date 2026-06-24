import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { handleCronPoll } from "../../lib/api/cron";

export const config = { runtime: "nodejs" };

/** GET /api/cron/poll — secured re-score of connected identities (cron + manual). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleCronPoll({
    authHeader: req.headers.authorization,
    schedule: (fn) => waitUntil(fn()),
  });
  return res.status(status).json(body);
}
