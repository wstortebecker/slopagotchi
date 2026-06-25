import { AtpAgent } from "@atproto/api";
import { resolveIdentity, resolveIdentityByDid } from "./resolve.js";
import { sanitizeRkey } from "./write.js";
import {
  DIAGNOSTIC_COLLECTION,
  PET_STATE_COLLECTION,
  DiagnosticRecordSchema,
  PetStateRecordSchema,
  type DiagnosticRecord,
  type PetStateRecord,
} from "../types.js";

/**
 * Reads the service repo's public records — pet state and diagnostics — for the
 * zoo/receipt UI. Unauthenticated; any client could do the same (R10).
 */

interface ServiceTarget {
  did: string;
  pds: string;
  agent: AtpAgent;
}

let target: ServiceTarget | null = null;

export async function getServiceReadTarget(): Promise<ServiceTarget> {
  if (target) return target;
  const identifier = process.env.SLOPGOTCHI_IDENTIFIER;
  if (!identifier) throw new Error("SLOPGOTCHI_IDENTIFIER is not set");
  const { did, pds } = identifier.startsWith("did:")
    ? await resolveIdentityByDid(identifier)
    : await resolveIdentity(identifier);
  target = { did, pds, agent: new AtpAgent({ service: pds }) };
  return target;
}

/** Reads a subject's pet-state record from the service repo (null if absent). */
export async function fetchPetState(
  subjectDid: string,
): Promise<PetStateRecord | null> {
  const { did, agent } = await getServiceReadTarget();
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: PET_STATE_COLLECTION,
      rkey: sanitizeRkey(subjectDid),
    });
    const parsed = PetStateRecordSchema.safeParse(res.data.value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // record not found
  }
}

/** Lists every developer's pet-state record from the service repo (paginated). */
export async function listAllPetStates(): Promise<PetStateRecord[]> {
  const { did, agent } = await getServiceReadTarget();
  const out: PetStateRecord[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();

  while (true) {
    const res = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: PET_STATE_COLLECTION,
      limit: 100,
      cursor,
    });
    for (const rec of res.data.records) {
      const parsed = PetStateRecordSchema.safeParse(rec.value);
      if (parsed.success) out.push(parsed.data);
    }
    const next = res.data.cursor;
    if (!next || res.data.records.length === 0 || seen.has(next)) break;
    seen.add(next);
    cursor = next;
  }
  return out;
}

/** Lists a subject's diagnostics from the service repo (paginated, filtered by subject). */
export async function fetchDiagnosticsForSubject(
  subjectDid: string,
): Promise<DiagnosticRecord[]> {
  const { did, agent } = await getServiceReadTarget();
  const out: DiagnosticRecord[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();

  while (true) {
    const res = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: DIAGNOSTIC_COLLECTION,
      limit: 100,
      cursor,
    });
    for (const rec of res.data.records) {
      const parsed = DiagnosticRecordSchema.safeParse(rec.value);
      if (parsed.success && parsed.data.subject === subjectDid) {
        out.push(parsed.data);
      }
    }
    const next = res.data.cursor;
    if (!next || res.data.records.length === 0 || seen.has(next)) break;
    seen.add(next);
    cursor = next;
  }
  return out;
}
