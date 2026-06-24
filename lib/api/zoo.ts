import { getTeamAccounts, getCachedPetState, isStoreConfigured } from "../store";
import { fetchPetState } from "../atproto/service";
import { PetStateRecordSchema, type PetStateRecord } from "../types";
import type { ApiResponse } from "./http";

/**
 * The team zoo as JSON (the SPA renders it): one pet-state record per member.
 * Cache-first (populated by the pipeline), falling back to the public ATProto
 * record. Degrades to an empty, `configured:false` payload when the datastore
 * isn't wired yet, so the frontend can show its demo roster instead of erroring.
 */

export interface ZooMemberDTO {
  handle: string;
  pet: PetStateRecord | null;
}

export interface ZooDTO {
  team: string;
  configured: boolean;
  members: ZooMemberDTO[];
}

/** Resolves one member's pet state: cache first, then the public record. */
async function resolveMemberPet(did: string): Promise<PetStateRecord | null> {
  const cached = await getCachedPetState(did);
  if (cached) {
    const parsed = PetStateRecordSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
  }
  try {
    return await fetchPetState(did);
  } catch {
    // Service read account not configured / unreachable: cache-only is fine.
    return null;
  }
}

export async function handleZoo(teamRaw: string): Promise<ApiResponse> {
  const team = teamRaw.toLowerCase().trim();
  if (!isStoreConfigured()) {
    return { status: 200, body: { team, configured: false, members: [] } satisfies ZooDTO };
  }

  const accounts = await getTeamAccounts(team);
  const members: ZooMemberDTO[] = await Promise.all(
    accounts.map(async (a) => ({
      handle: a.handle,
      pet: await resolveMemberPet(a.did),
    })),
  );
  members.sort((a, b) => a.handle.localeCompare(b.handle));

  return { status: 200, body: { team, configured: true, members } satisfies ZooDTO };
}
