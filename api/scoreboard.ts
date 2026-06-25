import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleScoreboard } from "../lib/api/scoreboard.js";

/** GET /api/scoreboard — every developer on the AT record, ranked by pet health. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const { status, body } = await handleScoreboard();
  return res.status(status).json(body);
}
