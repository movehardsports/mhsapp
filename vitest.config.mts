import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for plain logic in src/lib (no browser, no database): they sit next to the code as
// `*.test.ts`. Pages and flows are covered by the Playwright tests in e2e/.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
