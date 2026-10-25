import { type Browser, expect, type Page, test, type TestInfo } from "@playwright/test";
import { completeAthleteOnboarding, completeBrandOnboarding, signUp } from "./auth";
import { createCampaign, isoDate } from "./campaigns";
import { accessToken, rest, userId } from "./supabase";
import { gotoHydrated } from "./hydration";
import { alert, main } from "./page";

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

// A brand with one campaign; returns the brand's page and the campaign.
async function brandWithCampaign(
  browser: Browser,
  testInfo: TestInfo,
  deadline: string | null = null
) {
  const brand = await newPage(browser);
  await signUp(brand, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(brand);
  const title = uniqueTitle("Apply here");
  const id = await createCampaign(brand, { title, deadline });
  return { brand, id, title };
}

async function onboardedAthlete(browser: Browser, testInfo: TestInfo) {
  const athlete = await newPage(browser);
  await signUp(athlete, testInfo);
  await completeAthleteOnboarding(athlete);
  return athlete;
}

const applySection = (page: Page) => main(page).getByRole("region", { name: "Apply" });
const yourApplication = (page: Page) =>
  main(page).getByRole("region", { name: "Your application" });
const campaignItem = (page: Page, title: string) =>
  main(page).getByRole("listitem").filter({ hasText: title });

test("an athlete applies with a message, then withdraws", async ({ browser }, testInfo) => {
  const { brand, id, title } = await brandWithCampaign(browser, testInfo);
  const athlete = await onboardedAthlete(browser, testInfo);

  await gotoHydrated(athlete, `/campaigns/${id}`);
  await applySection(athlete)
    .getByLabel("Message to the brand")
    .fill("  I race Hyrox.\nPick me!  ");
  await applySection(athlete).getByRole("button", { name: "Apply" }).click();

  const application = yourApplication(athlete);
  await expect(application).toContainText("Status: Pending");
  await expect(application).toContainText("I race Hyrox.");
  await expect(applySection(athlete)).toHaveCount(0);
  // No form data ends up in the URL.
  await expect(athlete).toHaveURL(`/campaigns/${id}`);

  // The brand sees the application and can no longer delete the campaign.
  await brand.goto("/dashboard");
  await expect(campaignItem(brand, title)).toContainText("1 application");
  await expect(campaignItem(brand, title).getByRole("button", { name: /Delete/ })).toHaveCount(0);
  await brand.goto(`/dashboard/campaigns/${id}/edit`);
  await expect(main(brand)).toContainText("Athletes have applied to this campaign");
  await expect(main(brand).getByRole("button", { name: "Delete campaign" })).toHaveCount(0);

  // Withdrawing a pending application brings the form back.
  await application.getByRole("button", { name: "Withdraw application" }).click();
  await expect(applySection(athlete).getByLabel("Message to the brand")).toBeVisible();
  await expect(yourApplication(athlete)).toHaveCount(0);

  await brand.goto("/dashboard");
  await expect(campaignItem(brand, title)).toContainText("0 applications");
  await expect(campaignItem(brand, title).getByRole("button", { name: /Delete/ })).toBeVisible();
});

test("the message is checked on the server too", async ({ browser }, testInfo) => {
  const { id } = await brandWithCampaign(browser, testInfo);
  const athlete = await onboardedAthlete(browser, testInfo);

  await gotoHydrated(athlete, `/campaigns/${id}`);
  const form = applySection(athlete).locator("form");
  await form.evaluate((el) => el.setAttribute("novalidate", ""));
  await form.getByLabel("Message to the brand").fill("​");
  await form.getByRole("button", { name: "Apply" }).click();
  await expect(alert(athlete)).toHaveText("Write a short message (up to 1000 characters).");
});

test("closed campaigns take no applications", async ({ browser }, testInfo) => {
  const { id } = await brandWithCampaign(browser, testInfo, isoDate(-1));
  const athlete = await onboardedAthlete(browser, testInfo);

  await athlete.goto(`/campaigns/${id}`);
  await expect(main(athlete).getByText("Applications closed")).toBeVisible();
  await expect(main(athlete).getByLabel("Message to the brand")).toHaveCount(0);
});

test("a campaign whose deadline is today still takes applications", async ({
  browser,
}, testInfo) => {
  const { id } = await brandWithCampaign(browser, testInfo, isoDate(0));
  const athlete = await onboardedAthlete(browser, testInfo);

  await gotoHydrated(athlete, `/campaigns/${id}`);
  await applySection(athlete).getByLabel("Message to the brand").fill("Count me in.");
  await applySection(athlete).getByRole("button", { name: "Apply" }).click();
  await expect(yourApplication(athlete)).toContainText("Status: Pending");
});

test("guests, brands and athletes still onboarding can't apply", async ({
  browser,
  page,
}, testInfo) => {
  const { brand, id } = await brandWithCampaign(browser, testInfo);

  // Guests are asked to sign in or sign up.
  await page.goto(`/campaigns/${id}`);
  await expect(applySection(page).getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(applySection(page).getByLabel("Message to the brand")).toHaveCount(0);

  // Brands don't apply at all.
  await brand.goto(`/campaigns/${id}`);
  await expect(applySection(brand)).toHaveCount(0);

  // Athletes finish their profile first.
  await signUp(page, testInfo);
  await page.goto(`/campaigns/${id}`);
  await expect(applySection(page).getByRole("link", { name: "Finish your profile" })).toBeVisible();
  await expect(applySection(page).getByLabel("Message to the brand")).toHaveCount(0);
});

test("the dashboard marks campaigns whose deadline has passed", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const open = uniqueTitle("Open");
  const closed = uniqueTitle("Closed");
  await createCampaign(page, { title: open, deadline: isoDate(0) });
  await createCampaign(page, { title: closed, deadline: isoDate(-1) });

  await page.goto("/dashboard");
  // Screen readers hear "Applications closed" after the title.
  await expect(campaignItem(page, closed).getByRole("paragraph").first()).toHaveText(
    `${closed} Applications Closed`
  );
  await expect(campaignItem(page, open).getByText("Closed")).toHaveCount(0);
});

test("focus follows the section after applying, withdrawing and errors", async ({
  browser,
}, testInfo) => {
  const { id } = await brandWithCampaign(browser, testInfo);
  const athlete = await onboardedAthlete(browser, testInfo);
  await gotoHydrated(athlete, `/campaigns/${id}`);

  // An error moves focus back to the message, which the error describes.
  const message = applySection(athlete).getByLabel("Message to the brand");
  const form = applySection(athlete).locator("form");
  await form.evaluate((el) => el.setAttribute("novalidate", ""));
  // Enter on the focused button (Safari doesn't Tab to buttons by default).
  const apply = applySection(athlete).getByRole("button", { name: "Apply" });
  await message.fill(" ");
  await apply.press("Enter");
  await expect(message).toBeFocused();
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(message).toHaveAccessibleDescription(/Write a short message/);

  await message.fill("Count me in.");
  await apply.press("Enter");
  await expect(athlete.getByRole("heading", { name: "Your application" })).toBeFocused();

  await yourApplication(athlete)
    .getByRole("button", { name: "Withdraw application" })
    .press("Enter");
  await expect(athlete.getByRole("heading", { name: "Apply", exact: true })).toBeFocused();
});

test("applying after the campaign closed shows it closed", async ({ browser }, testInfo) => {
  const { brand, id } = await brandWithCampaign(browser, testInfo, isoDate(3));
  const athlete = await onboardedAthlete(browser, testInfo);
  await gotoHydrated(athlete, `/campaigns/${id}`);

  // The brand moves the deadline into the past while the form is open.
  const closed = await rest(`campaigns?id=eq.${id}`, {
    method: "PATCH",
    token: await accessToken(brand.context()),
    body: { deadline: isoDate(-1) },
  });
  expect(closed.status).toBe(204);

  await applySection(athlete).getByLabel("Message to the brand").fill("Count me in.");
  await applySection(athlete).getByRole("button", { name: "Apply" }).click();
  await expect(main(athlete).getByText("Applications closed")).toBeVisible();
  await expect(main(athlete).getByLabel("Message to the brand")).toHaveCount(0);
});

test("applying in a second tab keeps that tab's message and says why", async ({
  browser,
}, testInfo) => {
  const { id } = await brandWithCampaign(browser, testInfo);
  const athlete = await onboardedAthlete(browser, testInfo);
  // Same signed-in athlete, another tab (its own context, with the same cookies).
  const secondContext = await browser.newContext({
    storageState: await athlete.context().storageState(),
  });
  const secondTab = await secondContext.newPage();
  extraPages.push(secondTab);
  await gotoHydrated(secondTab, `/campaigns/${id}`);

  await gotoHydrated(athlete, `/campaigns/${id}`);
  await applySection(athlete).getByLabel("Message to the brand").fill("From the first tab.");
  await applySection(athlete).getByRole("button", { name: "Apply" }).click();
  await expect(yourApplication(athlete)).toContainText("From the first tab.");

  const message = applySection(secondTab).getByLabel("Message to the brand");
  await message.fill("From the second tab.");
  await applySection(secondTab).getByRole("button", { name: "Apply" }).click();
  await expect(alert(secondTab)).toContainText("You've already applied to this campaign");
  await expect(message).toHaveValue("From the second tab.");
});

test("a delete that loses the race to an application says why", async ({ browser }, testInfo) => {
  const { brand, id, title } = await brandWithCampaign(browser, testInfo);
  await gotoHydrated(brand, "/dashboard");
  const deleteButton = campaignItem(brand, title).getByRole("button", { name: /Delete/ });
  await expect(deleteButton).toBeVisible();

  // An athlete applies while the dashboard still offers Delete.
  const athlete = await onboardedAthlete(browser, testInfo);
  const applied = await rest("applications", {
    method: "POST",
    token: await accessToken(athlete.context()),
    body: { campaign_id: id, athlete_id: await userId(athlete.context()), message: "Hi" },
  });
  expect(applied.status).toBe(201);

  await deleteButton.click();
  await expect(brand.getByRole("status")).toContainText(
    "Campaigns with applications can't be deleted."
  );
  await expect(campaignItem(brand, title)).toContainText("1 application");
});
