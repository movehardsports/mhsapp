import { expect, test } from "@playwright/test";
import { completeAthleteOnboarding, signUp } from "./auth";
import { gotoHydrated } from "./hydration";

test("guests are sent to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/sign-in");
});

test("sends users to their onboarding until it's done", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Athlete" });
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/onboarding/athlete");
});

test("after onboarding, shows only the Sign out button and a screen-reader heading", async ({
  page,
}, testInfo) => {
  // An athlete: a brand's dashboard also lists its campaigns (see campaigns.spec.ts).
  await signUp(page, testInfo, { accountType: "Athlete" });
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/onboarding/athlete");
  await completeAthleteOnboarding(page);

  await gotoHydrated(page, "/dashboard");
  await expect(page).toHaveTitle("Dashboard | MHS");
  const main = page.getByRole("main");
  await expect(main.getByRole("button")).toHaveText(["Sign out"]);
  await expect(main.getByRole("link")).toHaveCount(0);
  await expect(main.getByRole("heading", { name: "Dashboard", level: 1 })).toBeAttached();
});
