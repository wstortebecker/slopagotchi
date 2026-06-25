import { getDidForHandle, getCachedPetState, normalizeHandle, isStoreConfigured } from "../store.js";
import { fetchPetState, fetchDiagnosticsForSubject } from "../atproto/service.js";
import { buildReceipt, type ReceiptData } from "../receipt.js";
import { PetStateRecordSchema, type PetStateRecord } from "../types.js";
import type { ApiResponse } from "./http.js";

/**
 * One developer's accountability view as JSON: the pet-state record plus the
 * receipt projection (PR history with deltas, latest reasons + medicine).
 * Framework-agnostic core of the original `/pet/[handle]` page.
 */

export interface PetDTO extends ReceiptData {
  handle: string;
  pet: PetStateRecord | null;
}

export async function handlePet(handleRaw: string): Promise<ApiResponse> {
  const norm = normalizeHandle(handleRaw);
  if (!isStoreConfigured()) {
    return { status: 404, body: { error: "unknown handle" } };
  }

  const did = await getDidForHandle(norm);
  if (!did) {
    return { status: 404, body: { error: "unknown handle" } };
  }

  let pet: PetStateRecord | null = null;
  const cached = await getCachedPetState(did);
  if (cached) {
    const parsed = PetStateRecordSchema.safeParse(cached);
    pet = parsed.success ? parsed.data : null;
  }
  if (!pet) {
    try {
      pet = await fetchPetState(did);
    } catch {
      pet = null;
    }
  }

  let receipt: ReceiptData = { prs: [], latestReasons: [], latestMedicine: [] };
  try {
    const diagnostics = await fetchDiagnosticsForSubject(did);
    receipt = buildReceipt(diagnostics);
  } catch {
    // Service read account not configured / unreachable: surface the pet only.
  }

  return { status: 200, body: { handle: norm, pet, ...receipt } satisfies PetDTO };
}
