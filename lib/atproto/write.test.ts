// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AtpAgent } from "@atproto/api";
import {
  diagnosticRkey,
  sanitizeRkey,
  buildDiagnosticRecord,
  buildPetStateRecord,
  writeDiagnostic,
  putPetState,
  getServiceAgent,
  isWriteConfigured,
  WriteError,
  RateLimitError,
  _resetServiceSession,
  type ServiceSession,
  type DiagnosticInput,
} from "./write";
import type { ScoredPatch, HealthResult } from "../types";
import {
  DIAGNOSTIC_COLLECTION,
  PET_STATE_COLLECTION,
  DiagnosticRecordSchema,
} from "../types";

const SCORED: ScoredPatch = {
  score: {
    score: 30,
    verdict: "minor",
    categories: {
      scopeDiscipline: 8,
      specificity: 6,
      dependencyRestraint: 6,
      testThoughtfulness: 6,
      maintainability: 4,
    },
    reasons: ["broad change"],
    medicine: ["split into smaller PRs"],
    confidence: "medium",
  },
  provenance: { model: "test-model", seed: 1, rulesetVersion: "v1" },
};

const HEALTH: HealthResult = {
  health: 70,
  band: "mild",
  state: "active",
  diagnosticCount: 1,
  latestDiagnosticUri: "at://did:plc:service/app.slopgotchi.diagnostic/dabc",
};

const baseInput: DiagnosticInput = {
  subject: "did:plc:dev",
  prUri: "at://did:plc:dev/sh.tangled.repo.pull/r1",
  round: 0,
  prTitle: "fix",
  scored: SCORED,
  createdAt: "2026-06-24T00:00:00Z",
};

/** Fake authenticated session whose putRecord is a vi mock. */
function fakeSession(opts: { throwStatus?: number } = {}): {
  session: ServiceSession;
  putRecord: ReturnType<typeof vi.fn>;
} {
  const putRecord = vi.fn(async (args: { rkey: string }) => {
    if (opts.throwStatus) {
      const e = new Error(`http ${opts.throwStatus}`) as Error & { status: number };
      e.status = opts.throwStatus;
      throw e;
    }
    return { data: { uri: `at://did:plc:service/coll/${args.rkey}`, cid: "bafycid" } };
  });
  const agent = {
    did: "did:plc:service",
    com: { atproto: { repo: { putRecord } } },
  } as unknown as AtpAgent;
  return { session: { agent, did: "did:plc:service" }, putRecord };
}

beforeEach(() => _resetServiceSession());

describe("diagnosticRkey", () => {
  it("is deterministic for the same (prUri, round)", () => {
    expect(diagnosticRkey("at://x/c/r1", 0)).toBe(diagnosticRkey("at://x/c/r1", 0));
  });
  it("differs across rounds of the same PR", () => {
    expect(diagnosticRkey("at://x/c/r1", 0)).not.toBe(diagnosticRkey("at://x/c/r1", 1));
  });
  it("produces a valid rkey charset", () => {
    expect(diagnosticRkey("at://x/c/r1", 0)).toMatch(/^[a-zA-Z0-9._~-]{1,512}$/);
  });
});

describe("sanitizeRkey", () => {
  it("maps a DID to a valid rkey (charset, length, not dot)", () => {
    const r = sanitizeRkey("did:plc:abc123");
    expect(r).toMatch(/^[a-zA-Z0-9._~-]{1,512}$/);
    expect(r.length).toBeLessThanOrEqual(512);
    expect(r).not.toBe(".");
    expect(r).not.toBe("..");
  });
  it("is stable for the same subject", () => {
    expect(sanitizeRkey("did:plc:abc")).toBe(sanitizeRkey("did:plc:abc"));
  });
  it("handles the pathological '.' subject", () => {
    expect([".", ".."]).not.toContain(sanitizeRkey("."));
  });
});

describe("buildDiagnosticRecord", () => {
  it("sets $type to the collection and marks the score a sample", () => {
    const rec = buildDiagnosticRecord(baseInput);
    expect(rec.$type).toBe(DIAGNOSTIC_COLLECTION);
    expect(rec.scoreIsSample).toBe(true);
    expect(rec.verdict).toBe("minor");
    expect(DiagnosticRecordSchema.safeParse(rec).success).toBe(true);
  });
  it("rejects an invalid score before any network call", () => {
    const bad = {
      ...baseInput,
      scored: { ...SCORED, score: { ...SCORED.score, score: 999 } },
    } as unknown as DiagnosticInput;
    expect(() => buildDiagnosticRecord(bad)).toThrow(WriteError);
  });

  it("defaults source to 'tangled' when omitted (KTD2 back-compat)", () => {
    const rec = buildDiagnosticRecord(baseInput);
    expect(rec.source).toBe("tangled");
    expect(rec.prUrl).toBeUndefined();
    expect(rec.github).toBeUndefined();
  });

  it("carries source/prUrl/github coordinates for a GitHub diagnostic", () => {
    const rec = buildDiagnosticRecord({
      ...baseInput,
      prUri: "github:o/r#5@abc",
      source: "github",
      prUrl: "https://github.com/o/r/pull/5",
      github: { owner: "o", repo: "r", prNumber: 5, headSha: "abc" },
    });
    expect(rec.source).toBe("github");
    expect(rec.prUrl).toBe("https://github.com/o/r/pull/5");
    expect(rec.github).toMatchObject({ owner: "o", repo: "r", prNumber: 5 });
    expect(DiagnosticRecordSchema.safeParse(rec).success).toBe(true);
  });

  it("a GitHub synthetic prUri yields a stable rkey distinct from any Tangled rkey (AE)", () => {
    const ghRkey = diagnosticRkey("github:o/r#5@abc", 0);
    expect(ghRkey).toBe(diagnosticRkey("github:o/r#5@abc", 0)); // stable
    expect(ghRkey).not.toBe(diagnosticRkey(baseInput.prUri, 0)); // distinct
  });
});

describe("buildPetStateRecord", () => {
  it("maps a health result onto the record", () => {
    const rec = buildPetStateRecord({ subject: "did:plc:dev", health: HEALTH });
    expect(rec.$type).toBe(PET_STATE_COLLECTION);
    expect(rec.band).toBe("mild");
    expect(rec.health).toBe(70);
  });
  it("accepts a null band (no-diagnoses state)", () => {
    const rec = buildPetStateRecord({
      subject: "did:plc:dev",
      health: { health: 100, band: null, state: "no-diagnoses", diagnosticCount: 0 },
    });
    expect(rec.band).toBeNull();
    expect(rec.state).toBe("no-diagnoses");
  });
});

describe("writeDiagnostic", () => {
  it("putRecords with the deterministic rkey", async () => {
    const { session, putRecord } = fakeSession();
    const res = await writeDiagnostic(baseInput, { session });
    expect(res.rkey).toBe(diagnosticRkey(baseInput.prUri, baseInput.round));
    expect(putRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: DIAGNOSTIC_COLLECTION,
        rkey: diagnosticRkey(baseInput.prUri, baseInput.round),
      }),
    );
  });

  it("does not duplicate when re-writing the same (prUri, round)", async () => {
    const { session, putRecord } = fakeSession();
    const a = await writeDiagnostic(baseInput, { session });
    const b = await writeDiagnostic(baseInput, { session });
    expect(a.rkey).toBe(b.rkey);
    expect(putRecord.mock.calls[0][0].rkey).toBe(putRecord.mock.calls[1][0].rkey);
  });

  it("rejects a malformed record before calling putRecord", async () => {
    const { session, putRecord } = fakeSession();
    const bad = {
      ...baseInput,
      scored: { ...SCORED, score: { ...SCORED.score, score: 999 } },
    } as unknown as DiagnosticInput;
    await expect(writeDiagnostic(bad, { session })).rejects.toBeInstanceOf(WriteError);
    expect(putRecord).not.toHaveBeenCalled();
  });

  it("surfaces a 429 as a typed RateLimitError", async () => {
    const { session } = fakeSession({ throwStatus: 429 });
    await expect(writeDiagnostic(baseInput, { session })).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });
});

describe("putPetState", () => {
  it("uses a stable rkey from the subject and overwrites on repeat", async () => {
    const { session, putRecord } = fakeSession();
    const a = await putPetState({ subject: "did:plc:dev", health: HEALTH }, { session });
    const b = await putPetState({ subject: "did:plc:dev", health: HEALTH }, { session });
    expect(a.rkey).toBe(sanitizeRkey("did:plc:dev"));
    expect(a.rkey).toBe(b.rkey);
    expect(putRecord.mock.calls[0][0].rkey).toBe(putRecord.mock.calls[1][0].rkey);
  });
});

describe("getServiceAgent", () => {
  it("throws a typed WriteError when the service account is unconfigured", async () => {
    const saved = {
      pds: process.env.SLOPGOTCHI_PDS,
      id: process.env.SLOPGOTCHI_IDENTIFIER,
      pw: process.env.SLOPGOTCHI_APP_PASSWORD,
    };
    delete process.env.SLOPGOTCHI_PDS;
    delete process.env.SLOPGOTCHI_IDENTIFIER;
    delete process.env.SLOPGOTCHI_APP_PASSWORD;
    _resetServiceSession();
    try {
      expect(isWriteConfigured()).toBe(false);
      await expect(getServiceAgent()).rejects.toBeInstanceOf(WriteError);
    } finally {
      if (saved.pds) process.env.SLOPGOTCHI_PDS = saved.pds;
      if (saved.id) process.env.SLOPGOTCHI_IDENTIFIER = saved.id;
      if (saved.pw) process.env.SLOPGOTCHI_APP_PASSWORD = saved.pw;
    }
  });
});

// --- Live: real writes to the service repo, read back unauthenticated ------
const live = process.env.SLOPGOTCHI_LIVE && isWriteConfigured() ? it : it.skip;

describe("write layer (live)", () => {
  live(
    "writes a diagnostic + pet-state and reads them back unauthenticated",
    async () => {
      _resetServiceSession();
      const session = await getServiceAgent();
      const subject = "did:plc:slopgotchitestsubject";
      const input: DiagnosticInput = {
        ...baseInput,
        subject,
        prUri: `at://${subject}/sh.tangled.repo.pull/livetest`,
      };
      const diag = await writeDiagnostic(input, { session });
      const pet = await putPetState({ subject, handle: "test.example", health: HEALTH }, { session });

      // Read back with a fresh unauthenticated agent.
      const pub = new AtpAgent({ service: process.env.SLOPGOTCHI_PDS! });
      const readDiag = await pub.com.atproto.repo.getRecord({
        repo: session.did,
        collection: DIAGNOSTIC_COLLECTION,
        rkey: diag.rkey,
      });
      expect((readDiag.data.value as { $type: string }).$type).toBe(DIAGNOSTIC_COLLECTION);

      const readPet = await pub.com.atproto.repo.getRecord({
        repo: session.did,
        collection: PET_STATE_COLLECTION,
        rkey: pet.rkey,
      });
      expect((readPet.data.value as { subject: string }).subject).toBe(subject);
    },
    60_000,
  );
});
