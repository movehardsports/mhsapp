import { defineConfig, devices } from "@playwright/test";

// Tests run against a production build on its own port, so they don't clash with `npm run dev`.
const PORT = 3100;

// Specs that call the Supabase APIs directly; the browser doesn't matter for them.
const apiSpecs = ["campaigns-rls.spec.ts", "api-rules.spec.ts"];
// The desktop header and flows checked on desktop only.
const desktopOnlySpecs = ["header.spec.ts", "session.spec.ts", "dashboard.spec.ts"];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Every spec runs on every project unless a project ignores it, so a new spec can't be
  // skipped by accident. Desktop-only and mobile-only UI specs are ignored where they don't
  // apply; API-level specs (no UI) run once, on desktop Chrome.
  projects: [
    {
      name: "desktop-chrome",
      testIgnore: ["mobile-menu.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "desktop-safari",
      testIgnore: ["mobile-menu.spec.ts", ...apiSpecs],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      testIgnore: [...desktopOnlySpecs, ...apiSpecs],
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      testIgnore: [...desktopOnlySpecs, ...apiSpecs],
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
