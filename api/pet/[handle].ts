import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handlePet } from "../../lib/api/pet";

export const config = { runtime: "nodejs" };

/** GET /api/pet/[handle] — one developer's pet state + slop receipt as JSON. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const raw = req.query.handle;
  const handle = Array.isArray(raw) ? raw[0] : (raw ?? "");
  const { status, body } = await handlePet(handle);
  return res.status(status).json(body);
}
