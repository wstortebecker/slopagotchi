import { IdResolver, getPds } from "@atproto/identity";
import type { DidDocument } from "@atproto/identity";

/**
 * Handle → DID → PDS resolution for the read layer.
 *
 * All developer reads are public and unauthenticated; this module turns a
 * Tangled handle (or DID) into the PDS endpoint where its repo lives, caching
 * the result so repeated polls don't re-resolve.
 */

export class IdentityResolutionError extends Error {
  constructor(
    message: string,
    readonly subject?: string,
  ) {
    super(message);
    this.name = "IdentityResolutionError";
  }
}

export interface ResolvedIdentity {
  did: string;
  pds: string;
  /** The handle this identity was resolved from, when resolution started from a handle. */
  handle?: string;
}

const idResolver = new IdResolver();

// Caches keyed independently so a DID-first lookup (cron) and a handle-first
// lookup (join) share the PDS resolution.
const handleToDid = new Map<string, string>();
const didToPds = new Map<string, string>();

/** Extracts the PDS service endpoint from a DID document. Pure; exported for testing. */
export function pdsFromDidDoc(doc: DidDocument | null): string | null {
  if (!doc) return null;
  return getPds(doc) ?? null;
}

/** Resolves a handle to its DID (cached). Throws {@link IdentityResolutionError} when unresolvable. */
export async function resolveHandleToDid(handle: string): Promise<string> {
  const key = handle.toLowerCase().replace(/^@/, "");
  const cached = handleToDid.get(key);
  if (cached) return cached;

  let did: string | undefined;
  try {
    did = await idResolver.handle.resolve(key);
  } catch (err) {
    throw new IdentityResolutionError(
      `Failed to resolve handle "${handle}": ${(err as Error).message}`,
      handle,
    );
  }
  if (!did) {
    throw new IdentityResolutionError(
      `Handle "${handle}" did not resolve to a DID`,
      handle,
    );
  }
  handleToDid.set(key, did);
  return did;
}

/** Resolves a DID to its PDS endpoint (cached). Throws when the DID doc has no PDS. */
export async function resolvePds(did: string): Promise<string> {
  const cached = didToPds.get(did);
  if (cached) return cached;

  let doc: DidDocument | null;
  try {
    doc = await idResolver.did.resolve(did);
  } catch (err) {
    throw new IdentityResolutionError(
      `Failed to resolve DID document for ${did}: ${(err as Error).message}`,
      did,
    );
  }
  const pds = pdsFromDidDoc(doc);
  if (!pds) {
    throw new IdentityResolutionError(`No PDS service entry for ${did}`, did);
  }
  didToPds.set(did, pds);
  return pds;
}

/** Resolves a handle all the way to `{ did, pds }`, caching both legs. */
export async function resolveIdentity(handle: string): Promise<ResolvedIdentity> {
  const did = await resolveHandleToDid(handle);
  const pds = await resolvePds(did);
  return { did, pds, handle };
}

/** Resolves a DID to `{ did, pds }` — the entry point for the cron pipeline. */
export async function resolveIdentityByDid(did: string): Promise<ResolvedIdentity> {
  const pds = await resolvePds(did);
  return { did, pds };
}

/** Clears the in-memory resolution caches (test helper). */
export function _clearResolutionCache(): void {
  handleToDid.clear();
  didToPds.clear();
}
