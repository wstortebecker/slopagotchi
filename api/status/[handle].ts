import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleStatus } from "../../lib/api/status";

/** GET /api/status/[handle] — join/backfill progress for the landing poll. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const raw = req.query.handle;
  const handle = Array.isArray(raw) ? raw[0] : (raw ?? "");
  const { status, body } = await handleStatus(handle);
  return res.status(status).json(body);
}
