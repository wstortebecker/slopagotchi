import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * One config for both halves of the app:
 *  - frontend tests run in jsdom (the default below)
 *  - backend/lib tests opt into the node environment with a
 *    `// @vitest-environment node` pragma at the top of the file
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
