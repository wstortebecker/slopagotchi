import {
  getDidForHandle,
  getAccount,
  getBackfillStatus,
  getDiagnostics,
  normalizeHandle,
} from "../store.js";
import type { ApiResponse } from "./http.js";

/**
 * Join/backfill progress for the landing poll: Joining → Backfilling → Done.
 * Framework-agnostic core of the original `GET /api/status/[handle]`.
 */
export async function handleStatus(handleRaw: string): Promise<ApiResponse> {
  const norm = normalizeHandle(handleRaw);
  const did = await getDidForHandle(norm);
  if (!did) {
    return { status: 404, body: { state: "unknown" } };
  }

  const [account, backfill, diagnostics] = await Promise.all([
    getAccount(did),
    getBackfillStatus(did),
    getDiagnostics(did),
  ]);

  const state =
    backfill === "done"
      ? "done"
      : backfill === "running"
        ? "backfilling"
        : "joining";

  return {
    status: 200,
    body: {
      state,
      did,
      handle: norm,
      team: account?.team,
      diagnosticCount: diagnostics.length,
    },
  };
}
