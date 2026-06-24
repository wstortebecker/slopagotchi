/**
 * Framework-agnostic HTTP plumbing shared by the API core handlers.
 *
 * The core handlers (join, status, cron, zoo, pet) are pure async functions
 * that take plain inputs and return an {@link ApiResponse}. The thin Vercel
 * serverless adapters in `/api` translate `VercelRequest`/`VercelResponse`
 * to and from these — which keeps all the logic unit-testable without a server
 * and portable off any one host.
 */

/** A status code + JSON-serialisable body, returned by every core handler. */
export interface ApiResponse {
  status: number;
  body: unknown;
}

/**
 * Schedules background work to run after the response is sent. On Vercel this
 * is `waitUntil`; in tests it's a spy that captures the callback. Mirrors the
 * Next.js `after()` the original routes used.
 */
export type Schedule = (fn: () => Promise<void>) => void;

/** A schedule that runs the work inline (await it). Useful as a safe default. */
export const runInline: Schedule = (fn) => {
  void fn();
};

/** Extracts the best-effort client IP from forwarded headers. */
export function clientIpFromHeader(forwardedFor: string | undefined | null): string {
  return (forwardedFor ?? "unknown").split(",")[0].trim() || "unknown";
}
