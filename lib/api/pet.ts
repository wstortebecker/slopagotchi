import { getDidForHandle, getCachedPetState, normalizeHandle, isStoreConfigured } from "../store.js";
import { fetchPetState, fetchDiagnosticsForSubject } from "../atproto/service.js";
import { buildReceipt, type ReceiptData } from "../receipt.js";
import { PetStateRecordSchema, isGithubSubject, type PetStateRecord } from "../types.js";
import type { ApiResponse } from "./http.js";

/**
 * One developer's accountability view as JSON: the pet-state record plus the
 * receipt projection (PR history with deltas, latest reasons + medicine).
 * Framework-agnostic core of the original `/pet/[handle]` page.
 *
 * Accepts either a Tangled/linked handle (resolved to a DID via the store) or a
 * standalone `github:<login>` subject used directly as the diagnostic/pet key —
 * standalone GitHub pets have no atproto handle, so there's nothing to resolve.
 */

export interface PetDTO extends ReceiptData {
  handle: string;
  pet: PetStateRecord | null;
}

export async function handlePet(handleRaw: string): Promise<ApiResponse> {
  const norm = normalizeHandle(handleRaw);

  // Resolve the subject key: a standalone GitHub subject is used verbatim; a
  // handle is resolved through the store to its DID.
  let subject: string;
  if (isGithubSubject(norm)) {
    subject = norm;
  } else {
    if (!isStoreConfigured()) {
      return { status: 404, body: { error: "unknown handle" } };
    }
    const did = await getDidForHandle(norm);
    if (!did) {
      return { status: 404, body: { error: "unknown handle" } };
    }
    subject = did;
  }

  let pet: PetStateRecord | null = null;
  if (isStoreConfigured()) {
    const cached = await getCachedPetState(subject);
    if (cached) {
      const parsed = PetStateRecordSchema.safeParse(cached);
      pet = parsed.success ? parsed.data : null;
    }
  }
  if (!pet) {
    try {
      pet = await fetchPetState(subject);
    } catch {
      pet = null;
    }
  }

  let receipt: ReceiptData = { prs: [], latestReasons: [], latestMedicine: [] };
  try {
    const diagnostics = await fetchDiagnosticsForSubject(subject);
    receipt = buildReceipt(diagnostics);
  } catch {
    // Service read account not configured / unreachable: surface the pet only.
  }

  return { status: 200, body: { handle: norm, pet, ...receipt } satisfies PetDTO };
}
