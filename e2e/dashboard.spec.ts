import { expect, test } from "@playwright/test";
import { completeAthleteOnboarding, completeBrandOnboarding, signUp } from "./auth";
import { createCampaign } from "./campaigns";
import { accessToken, rest, userId } from "./supabase";
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

test("an athlete with no applications sees the empty state and can sign out", async ({
  page,
}, testInfo) => {
  // A brand's dashboard instead lists its campaigns (see campaigns.spec.ts).
  await signUp(page, testInfo, { accountType: "Athlete" });
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/onboarding/athlete");
  await completeAthleteOnboarding(page);

  await gotoHydrated(page, "/dashboard");
  await expect(page).toHaveTitle("Dashboard | MHS");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Dashboard", level: 1 })).toBeAttached();
  await expect(main.getByRole("heading", { name: "Your applications" })).toBeVisible();
  await expect(main.getByText("You haven't applied to any campaigns yet")).toBeVisible();
  await expect(main.getByRole("link", { name: "Browse campaigns" })).toHaveAttribute(
    "href",
    "/campaigns"
  );
  await expect(main.getByRole("button")).toHaveText(["Sign out"]);
});

test("an athlete's application to a closed campaign is marked closed", async ({
  browser,
  page,
}, testInfo) => {
  const brand = await browser.newPage();
  try {
    await signUp(brand, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(brand);
    const title = `Closed ${crypto.randomUUID().slice(0, 8)}`;
    // Open when applied to; the brand then moves the deadline into the past (Data API).
    const campaignId = await createCampaign(brand, { title });

    await signUp(page, testInfo, { accountType: "Athlete" });
    await completeAthleteOnboarding(page);
    const applied = await rest("applications", {
      method: "POST",
      token: await accessToken(page.context()),
      body: {
        campaign_id: campaignId,
        athlete_id: await userId(page.context()),
        message: "Count me in.",
      },
    });
    expect(applied.status).toBe(201);
    const closed = await rest(`campaigns?id=eq.${campaignId}`, {
      method: "PATCH",
      token: await accessToken(brand.context()),
      body: { deadline: "2020-01-01" },
    });
    expect(closed.status).toBe(204);

    await gotoHydrated(page, "/dashboard");
    const item = page.getByRole("main").getByRole("listitem").filter({ hasText: title });
    await expect(item).toContainText("Closed");
  } finally {
    await brand.close();
  }
});

test("an athlete sees their applications, newest first, linking to each campaign", async ({
  browser,
  page,
}, testInfo) => {
  // A brand with two campaigns to apply to.
  const brand = await browser.newPage();
  try {
    await signUp(brand, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(brand);
    const older = `Older ${crypto.randomUUID().slice(0, 8)}`;
    const newer = `Newer ${crypto.randomUUID().slice(0, 8)}`;
    const olderId = await createCampaign(brand, { title: older });
    const newerId = await createCampaign(brand, { title: newer });

    // An onboarded athlete applies to both, older first, through the Data API.
    await signUp(page, testInfo, { accountType: "Athlete" });
    await completeAthleteOnboarding(page);
    const athleteId = await userId(page.context());
    const token = await accessToken(page.context());
    for (const campaignId of [olderId, newerId]) {
      const applied = await rest("applications", {
        method: "POST",
        token,
        body: { campaign_id: campaignId, athlete_id: athleteId, message: "Count me in." },
      });
      expect(applied.status).toBe(201);
    }

    await gotoHydrated(page, "/dashboard");
    const main = page.getByRole("main");
    const items = main.getByRole("listitem");
    await expect(items).toHaveCount(2);
    // Newest first.
    await expect(items.first()).toContainText(newer);
    await expect(items.last()).toContainText(older);
    const item = items.filter({ hasText: newer });
    await expect(item).toContainText("Move Hard");
    await expect(item).toContainText("Event");
    await expect(item).toContainText("Status: Pending");
    await expect(item).toContainText("Applied");
    // The newer campaign is open, so it carries no Closed marker.
    await expect(item.getByText("Closed")).toHaveCount(0);
    await item.getByRole("link", { name: newer }).click();
    await expect(page).toHaveURL(`/campaigns/${newerId}`);
  } finally {
    await brand.close();
  }
});
