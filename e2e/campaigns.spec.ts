import { expect, type Page, test } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { gotoHydrated } from "./hydration";
import { rest, userId } from "./supabase";

const main = (page: Page) => page.getByRole("main");
const alert = (page: Page) => main(page).getByRole("alert");
const submit = (page: Page) => main(page).getByRole("button", { name: "Create campaign" });
const sportsGroup = (page: Page) => page.getByRole("group", { name: "Sports" });

// Removes the browser's own checks, to test the Server Action's.
const skipBrowserValidation = (page: Page) =>
  main(page)
    .locator("form")
    .evaluate((form) => form.setAttribute("novalidate", ""));

// YYYY-MM-DD in UTC, `days` from today; the app uses the UTC date too.
const isoDate = (days = 0) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function fillCampaign(
  page: Page,
  {
    type = "Event",
    title = "Spring Hyrox Open",
    description = "Race day in Warsaw.\nBring your crew.",
    sport = "Hyrox",
    deadline = "",
  } = {}
) {
  await main(page).getByText(type, { exact: true }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await sportsGroup(page).getByText(sport, { exact: true }).click();
  if (deadline) await page.getByLabel("Deadline").fill(deadline);
}

async function campaignsOf(page: Page) {
  const response = await rest(
    `campaigns?brand_id=eq.${await userId(page.context())}&select=type,title,description,sports,deadline&order=created_at.desc`
  );
  return response.json();
}

test.describe("access", () => {
  test("guests are sent to sign in", async ({ page }) => {
    await page.goto("/dashboard/campaigns/new");
    await expect(page).toHaveURL("/sign-in");
  });

  test("athletes are sent away", async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Athlete" });
    await page.goto("/dashboard/campaigns/new");
    // To the dashboard, which sends an athlete without a profile on to their onboarding.
    await expect(page).toHaveURL("/onboarding/athlete");
  });

  test("brands without a profile finish the onboarding first", async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await page.goto("/dashboard/campaigns/new");
    await expect(page).toHaveURL("/onboarding/brand");
  });
});

test.describe("form", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(page);
    await gotoHydrated(page, "/dashboard/campaigns/new");
  });

  test("shows the campaign fields", async ({ page }) => {
    await expect(page).toHaveTitle("New campaign | MHS");
    await expect(main(page).getByRole("heading", { name: "New campaign" })).toBeVisible();
    for (const type of ["Sponsorship", "Event", "Ambassador"]) {
      await expect(main(page).getByText(type, { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Deadline")).toHaveAttribute("min", isoDate());
  });

  test("creates a campaign and goes back to the dashboard", async ({ page }) => {
    await fillCampaign(page, { deadline: isoDate(30) });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");
    expect(await campaignsOf(page)).toEqual([
      {
        type: "event",
        title: "Spring Hyrox Open",
        description: "Race day in Warsaw.\nBring your crew.",
        sports: ["hyrox"],
        deadline: isoDate(30),
      },
    ]);
  });

  test("keeps inner line breaks and trims the description", async ({ page }) => {
    await fillCampaign(page, { description: "\n\n  First line\r\n\r\nSecond line  \n" });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");
    const [campaign] = await campaignsOf(page);
    expect(campaign.description).toBe("First line\n\nSecond line");
  });

  test("accepts today as the deadline", async ({ page }) => {
    await fillCampaign(page, { deadline: isoDate() });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("rejects a blank description on the server, keeping the values", async ({ page }) => {
    await fillCampaign(page, { description: "   " });
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Enter a description (up to 5000 characters).");
    await expect(page).toHaveURL("/dashboard/campaigns/new");
    await expect(page.getByLabel("Title")).toHaveValue("Spring Hyrox Open");
    await expect(main(page).getByLabel("Event")).toBeChecked();
    await expect(sportsGroup(page).getByLabel("Hyrox")).toBeChecked();
  });

  test("rejects a deadline in the past on the server", async ({ page }) => {
    await fillCampaign(page, { deadline: isoDate(-1) });
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Pick a deadline from today on, or leave it empty.");
    expect(await campaignsOf(page)).toEqual([]);
  });

  test("checks the type and sports on the server too", async ({ page }) => {
    await page.getByLabel("Title").fill("No type");
    await page.getByLabel("Description").fill("Text");
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Choose a campaign type.");

    await main(page).getByText("Event", { exact: true }).click();
    await submit(page).click();
    await expect(alert(page)).toHaveText("Choose at least one sport.");
  });
});
