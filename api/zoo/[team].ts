import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleZoo } from "../../lib/api/zoo.js";

/** GET /api/zoo/[team] — the team's pet-state records as JSON for the SPA. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const raw = req.query.team;
  const team = Array.isArray(raw) ? raw[0] : (raw ?? "");
  const { status, body } = await handleZoo(team);
  return res.status(status).json(body);
}
