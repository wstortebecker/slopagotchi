// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the identity SDK so resolution logic is testable without network.
// vi.hoisted keeps these defined before the hoisted vi.mock factory runs.
const { handleResolve, didResolve } = vi.hoisted(() => ({
  handleResolve: vi.fn(),
  didResolve: vi.fn(),
}));
vi.mock("@atproto/identity", () => ({
  IdResolver: class {
    handle = { resolve: handleResolve };
    did = { resolve: didResolve };
  },
  getPds: (doc: { service?: { id: string; serviceEndpoint: string }[] } | null) =>
    doc?.service?.find((s) => s.id === "#atproto_pds")?.serviceEndpoint,
}));

import {
  resolveHandleToDid,
  resolvePds,
  resolveIdentity,
  pdsFromDidDoc,
  IdentityResolutionError,
  _clearResolutionCache,
} from "./resolve";

const DOC = {
  service: [
    {
      id: "#atproto_pds",
      type: "AtprotoPersonalDataServer",
      serviceEndpoint: "https://pds.example",
    },
  ],
};

beforeEach(() => {
  _clearResolutionCache();
  handleResolve.mockReset();
  didResolve.mockReset();
});

describe("pdsFromDidDoc", () => {
  it("extracts the PDS endpoint", () => {
    expect(pdsFromDidDoc(DOC as never)).toBe("https://pds.example");
  });
  it("returns null for a null doc", () => {
    expect(pdsFromDidDoc(null)).toBeNull();
  });
});

describe("resolveHandleToDid", () => {
  it("resolves a known handle and caches it (no second fetch)", async () => {
    handleResolve.mockResolvedValue("did:plc:abc");
    expect(await resolveHandleToDid("alice.test")).toBe("did:plc:abc");
    expect(await resolveHandleToDid("alice.test")).toBe("did:plc:abc");
    expect(handleResolve).toHaveBeenCalledTimes(1);
  });

  it("throws a typed error for an unresolvable handle (no crash)", async () => {
    handleResolve.mockResolvedValue(undefined);
    await expect(resolveHandleToDid("nope.invalid")).rejects.toBeInstanceOf(
      IdentityResolutionError,
    );
  });
});

describe("resolvePds", () => {
  it("resolves and caches the PDS for a DID", async () => {
    didResolve.mockResolvedValue(DOC);
    expect(await resolvePds("did:plc:abc")).toBe("https://pds.example");
    expect(await resolvePds("did:plc:abc")).toBe("https://pds.example");
    expect(didResolve).toHaveBeenCalledTimes(1);
  });

  it("throws a typed error when the DID doc has no PDS entry", async () => {
    didResolve.mockResolvedValue({ service: [] });
    await expect(resolvePds("did:plc:abc")).rejects.toBeInstanceOf(
      IdentityResolutionError,
    );
  });
});

describe("resolveIdentity", () => {
  it("resolves a handle all the way to { did, pds }", async () => {
    handleResolve.mockResolvedValue("did:plc:abc");
    didResolve.mockResolvedValue(DOC);
    expect(await resolveIdentity("alice.test")).toEqual({
      did: "did:plc:abc",
      pds: "https://pds.example",
      handle: "alice.test",
    });
  });
});
