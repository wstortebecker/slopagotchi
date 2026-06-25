import {
  getDidForHandle,
  getAccount,
  getBackfillStatus,
  getDiagnostics,
  normalizeHandle,
} from "../store.js";
import { isGithubSubject } from "../types.js";
import type { ApiResponse } from "./http.js";

/**
 * Join/backfill progress for the landing poll: Joining → Backfilling → Done.
 * Framework-agnostic core of the original `GET /api/status/[handle]`.
 *
 * A standalone `github:<login>` subject has no account/backfill marker, so its
 * progress is inferred from whether any diagnostics have landed yet.
 */
export async function handleStatus(handleRaw: string): Promise<ApiResponse> {
  const norm = normalizeHandle(handleRaw);

  if (isGithubSubject(norm)) {
    const diagnostics = await getDiagnostics(norm);
    return {
      status: 200,
      body: {
        state: diagnostics.length > 0 ? "done" : "backfilling",
        subject: norm,
        handle: norm,
        diagnosticCount: diagnostics.length,
      },
    };
  }

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
