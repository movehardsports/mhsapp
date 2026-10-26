import { type Browser, expect, type Page, test, type TestInfo } from "@playwright/test";
import { completeAthleteOnboarding, completeBrandOnboarding, signUp } from "./auth";
import { createCampaign } from "./campaigns";
import { gotoHydrated } from "./hydration";
import { main } from "./page";
import { accessToken, rest, userId } from "./supabase";

// The brand and the athlete each get their own context, closed after every test.
const extraPages: Page[] = [];
test.afterEach(async () => {
  await Promise.all(extraPages.splice(0).map((page) => page.close()));
});
async function newPage(browser: Browser) {
  const page = await browser.newPage();
  extraPages.push(page);
  return page;
}

const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`;

// A brand with one campaign an onboarded athlete has applied to. Returns both pages and the ids.
async function campaignWithApplication(browser: Browser, testInfo: TestInfo) {
  const brand = await newPage(browser);
  await signUp(brand, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(brand);
  const title = uniqueTitle("Review");
  const campaignId = await createCampaign(brand, { title });

  const athlete = await newPage(browser);
  await signUp(athlete, testInfo);
  await completeAthleteOnboarding(athlete);
  const applied = await rest("applications", {
    method: "POST",
    token: await accessToken(athlete.context()),
    body: {
      campaign_id: campaignId,
      athlete_id: await userId(athlete.context()),
      message: "Pick me!",
    },
  });
  expect(applied.status).toBe(201);
  return { brand, athlete, campaignId, title };
}

test("a brand opens the applications from its dashboard and sees the applicant", async ({
  browser,
}, testInfo) => {
  const { brand, campaignId, title } = await campaignWithApplication(browser, testInfo);

  await gotoHydrated(brand, "/dashboard");
  const row = main(brand).getByRole("listitem").filter({ hasText: title });
  await row.getByRole("link", { name: `Applications to ${title}` }).click();
  await expect(brand).toHaveURL(`/dashboard/campaigns/${campaignId}/applications`);
  await expect(brand).toHaveTitle("Applications | MHS");

  const applicant = main(brand).getByRole("listitem");
  await expect(applicant).toContainText("Jane");
  await expect(applicant).toContainText("JD");
  await expect(applicant).toContainText("Warsaw");
  await expect(applicant).toContainText("Hyrox");
  await expect(applicant).toContainText("Pick me!");
  await expect(applicant).toContainText("Status: Pending");
  // The last name is never shown to the brand.
  await expect(main(brand)).not.toContainText("Doe");
});

test("a campaign with no applications shows the empty state", async ({ browser }, testInfo) => {
  const brand = await newPage(browser);
  await signUp(brand, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(brand);
  const title = uniqueTitle("Empty");
  const campaignId = await createCampaign(brand, { title });

  await gotoHydrated(brand, "/dashboard");
  const row = main(brand).getByRole("listitem").filter({ hasText: title });
  await expect(row.getByRole("link", { name: `Applications to ${title}` })).toContainText(
    "Applications (0)"
  );
  await brand.goto(`/dashboard/campaigns/${campaignId}/applications`);
  await expect(main(brand).getByText("No applications yet.")).toBeVisible();
});

test("a brand accepts, rejects and resets, and the athlete sees each status", async ({
  browser,
}, testInfo) => {
  const { brand, athlete, campaignId } = await campaignWithApplication(browser, testInfo);
  const page = `/dashboard/campaigns/${campaignId}/applications`;
  const applicant = main(brand).getByRole("listitem");

  await gotoHydrated(brand, page);
  await applicant.getByRole("button", { name: /^Accept/ }).click();
  await expect(applicant).toContainText("Status: Accepted");
  // The applicant sees it on the campaign page.
  await athlete.goto(`/campaigns/${campaignId}`);
  await expect(main(athlete)).toContainText("Status: Accepted");
  // An accepted application can no longer be withdrawn.
  await expect(main(athlete).getByRole("button", { name: "Withdraw application" })).toHaveCount(0);

  await applicant.getByRole("button", { name: /^Reject/ }).click();
  await expect(applicant).toContainText("Status: Rejected");

  // Reversible: back to pending, and the athlete can withdraw again.
  await applicant.getByRole("button", { name: /Reset to pending/ }).click();
  await expect(applicant).toContainText("Status: Pending");
  await athlete.goto(`/campaigns/${campaignId}`);
  await expect(main(athlete).getByRole("button", { name: "Withdraw application" })).toBeVisible();
});

test("athletes, guests and other brands can't open the applications page", async ({
  browser,
  page,
}, testInfo) => {
  const { campaignId } = await campaignWithApplication(browser, testInfo);
  const url = `/dashboard/campaigns/${campaignId}/applications`;

  // Guest → sign in.
  const guestResponse = await page.goto(url);
  await expect(page).toHaveURL("/sign-in");

  // Athlete → their dashboard (brand-only area).
  await signUp(page, testInfo);
  await completeAthleteOnboarding(page);
  await page.goto(url);
  await expect(page).toHaveURL("/dashboard");
  expect(guestResponse).toBeTruthy();

  // Another brand → 404.
  const other = await newPage(browser);
  await signUp(other, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(other);
  const response = await other.goto(url);
  expect(response?.status()).toBe(404);
  await expect(other).toHaveTitle("Page not found | MHS");
});
