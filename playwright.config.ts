import { defineConfig, devices } from "@playwright/test";

// Tests run against a production build on its own port, so they don't clash with `npm run dev`.
const PORT = 3100;

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
  projects: [
    {
      name: "desktop-chrome",
      testMatch: ["header.spec.ts", "sign-up.spec.ts", "sign-in.spec.ts", "onboarding.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "desktop-safari",
      testMatch: ["header.spec.ts", "sign-up.spec.ts", "sign-in.spec.ts", "onboarding.spec.ts"],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      testMatch: ["mobile-menu.spec.ts", "sign-up.spec.ts", "sign-in.spec.ts", "onboarding.spec.ts"],
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      testMatch: ["mobile-menu.spec.ts", "sign-up.spec.ts", "sign-in.spec.ts", "onboarding.spec.ts"],
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
