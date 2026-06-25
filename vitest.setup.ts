import { vi } from "vitest";
import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";

// Components render TopBar (and others) that use Clerk. Tests mount these in
// isolation without a <ClerkProvider>, so mock the SDK with test-safe no-ops.
vi.mock("@clerk/clerk-react", () => {
  const Passthrough = ({ children }: { children?: ReactNode }) => children ?? null;
  const Empty = () => null;
  return {
    ClerkProvider: Passthrough,
    SignedIn: Passthrough,
    SignedOut: Empty,
    SignIn: Empty,
    SignUp: Empty,
    UserButton: Empty,
    PricingTable: Empty,
    Protect: Passthrough,
    useAuth: () => ({ getToken: async () => null, isSignedIn: false, userId: null }),
    useUser: () => ({ user: null, isLoaded: true, isSignedIn: false }),
    useClerk: () => ({}),
  };
});

// jsdom doesn't always expose a usable `localStorage` global (opaque origin on
// the default about:blank document). The app reads/writes it directly, so give
// tests a simple in-memory implementation when one isn't present.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  const localStorageShim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageShim,
    configurable: true,
  });
}
