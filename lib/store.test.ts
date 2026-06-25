import { describe, it, expect } from "vitest";
import { isStoreConfigured, healthCheck } from "./store";

// Integration: only runs when Upstash is configured; skips cleanly otherwise so
// the suite stays green without secrets.
const maybe = isStoreConfigured() ? it : it.skip;

describe("store", () => {
  it("reports configuration state from the environment", () => {
    expect(typeof isStoreConfigured()).toBe("boolean");
  });

  maybe("round-trips a value through Redis", async () => {
    expect(await healthCheck()).toBe(true);
  });
});
