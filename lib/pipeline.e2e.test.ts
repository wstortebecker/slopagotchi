// @vitest-environment node
// Full end-to-end pipeline against real services (ATProto + Featherless +
// Upstash). Opt in with SLOPGOTCHI_LIVE=1 and all creds present; skipped
// otherwise. Writes real records for the resolved DID into the service repo.
import { describe, it, expect } from "vitest";
import { resolveIdentity } from "./atproto/resolve";
import { isScorerConfigured } from "./scorer/featherless";
import { isWriteConfigured } from "./atproto/write";
import { isStoreConfigured, registerAccount, getDiagnostics } from "./store";
import { processSubject } from "./pipeline";
import { fetchPetState } from "./atproto/service";

const ready =
  process.env.SLOPGOTCHI_LIVE &&
  isScorerConfigured() &&
  isWriteConfigured() &&
  isStoreConfigured();
const live = ready ? it : it.skip;

describe("pipeline e2e (live)", () => {
  live(
    "scores a real handle's PR round and publishes pet state idempotently",
    async () => {
      const { did, pds, handle } = await resolveIdentity("oppi.li");
      await registerAccount("e2e", did, handle ?? "oppi.li");

      // First pass: score a single round to bound Featherless cost.
      const first = await processSubject(did, { pds, handle, maxRounds: 1 });
      expect(first.processed).toBeGreaterThanOrEqual(1);
      expect(first.petUpdated).toBe(true);

      const pet = await fetchPetState(did);
      expect(pet).not.toBeNull();
      expect(pet!.health).toBeGreaterThanOrEqual(0);
      expect(pet!.health).toBeLessThanOrEqual(100);

      const before = await getDiagnostics(did);
      expect(before.length).toBeGreaterThanOrEqual(1);

      // Re-running never duplicates: the per-round cache grows by exactly the
      // number of newly-processed rounds (claim guards prevent re-scoring).
      const second = await processSubject(did, { pds, handle, maxRounds: 1 });
      const after = await getDiagnostics(did);
      expect(after.length - before.length).toBe(second.processed);
    },
    240_000,
  );
});
