import { expect, type Page, test } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { gotoHydrated } from "./hydration";
import { accessToken, rest, userId } from "./supabase";

const main = (page: Page) => page.getByRole("main");
const alert = (page: Page) => main(page).getByRole("alert");
const submit = (page: Page) => main(page).getByRole("button", { name: "Create campaign" });
const sportsGroup = (page: Page) => page.getByRole("group", { name: "Sports" });

// Removes the browser's own checks, to test the Server Action's. The campaign form comes
// first; the edit page has a delete form below it.
const skipBrowserValidation = (page: Page) =>
  main(page)
    .locator("form")
    .first()
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

  test("the dashboard lists the brand's campaigns, newest first", async ({ page }) => {
    await gotoHydrated(page, "/dashboard");
    const campaigns = main(page).getByRole("region", { name: "Campaigns" });
    await expect(campaigns.getByText("No campaigns yet")).toBeVisible();

    await campaigns.getByRole("link", { name: "New campaign" }).click();
    await expect(page).toHaveURL("/dashboard/campaigns/new");
    await fillCampaign(page, { title: "First", deadline: "2099-12-31" });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");

    await gotoHydrated(page, "/dashboard/campaigns/new");
    await fillCampaign(page, { title: "Second", type: "Ambassador", sport: "Surf" });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");

    const items = campaigns.getByRole("listitem");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("Second");
    await expect(items.nth(0)).toContainText("Ambassador");
    await expect(items.nth(0)).toContainText("Surf");
    await expect(items.nth(0)).not.toContainText("Apply by");
    await expect(items.nth(1)).toContainText("First");
    await expect(items.nth(1)).toContainText("Event");
    await expect(items.nth(1)).toContainText("Hyrox");
    await expect(items.nth(1)).toContainText("Apply by 31 Dec 2099");
    await expect(campaigns.getByText("No campaigns yet")).toHaveCount(0);
  });
});

test.describe("edit and delete", () => {
  // Creates a campaign straight through the Data API; the database doesn't check that the
  // deadline is in the future, so this can also make one whose deadline has passed.
  async function createCampaign(page: Page, deadline: string | null = null) {
    const response = await rest("campaigns", {
      method: "POST",
      token: await accessToken(page.context()),
      body: {
        brand_id: await userId(page.context()),
        type: "event",
        title: "Spring Hyrox Open",
        description: "Race day in Warsaw.",
        sports: ["hyrox"],
        deadline,
      },
    });
    expect(response.status).toBe(201);
    const [{ id }] = await (
      await rest(`campaigns?brand_id=eq.${await userId(page.context())}&select=id`)
    ).json();
    return id as string;
  }

  const save = (page: Page) => main(page).getByRole("button", { name: "Save changes" });

  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(page);
  });

  test("opens from the dashboard with the saved values and saves changes", async ({ page }) => {
    await createCampaign(page, "2099-12-31");
    await gotoHydrated(page, "/dashboard");
    await main(page).getByRole("link", { name: "Edit Spring Hyrox Open" }).click();
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/[0-9a-f-]+\/edit$/);
    await expect(page).toHaveTitle("Edit campaign | MHS");

    await expect(page.getByLabel("Title")).toHaveValue("Spring Hyrox Open");
    await expect(page.getByLabel("Description")).toHaveValue("Race day in Warsaw.");
    await expect(main(page).getByLabel("Event")).toBeChecked();
    await expect(sportsGroup(page).getByLabel("Hyrox")).toBeChecked();
    await expect(page.getByLabel("Deadline")).toHaveValue("2099-12-31");

    await main(page).getByText("Ambassador", { exact: true }).click();
    await page.getByLabel("Title").fill("Summer Surf Crew");
    await page.getByLabel("Description").fill("New text");
    await sportsGroup(page).getByText("Hyrox", { exact: true }).click();
    await sportsGroup(page).getByText("Surf", { exact: true }).click();
    await page.getByLabel("Deadline").fill("2099-06-30");
    await save(page).click();

    await expect(page).toHaveURL("/dashboard");
    expect(await campaignsOf(page)).toEqual([
      {
        type: "ambassador",
        title: "Summer Surf Crew",
        description: "New text",
        sports: ["surf"],
        deadline: "2099-06-30",
      },
    ]);
  });

  test("rejects invalid changes on the server, keeping the values", async ({ page }) => {
    const id = await createCampaign(page);
    await gotoHydrated(page, `/dashboard/campaigns/${id}/edit`);
    await page.getByLabel("Title").fill("Changed");
    await page.getByLabel("Description").fill("   ");
    await skipBrowserValidation(page);
    await save(page).click();
    await expect(alert(page)).toHaveText("Enter a description (up to 5000 characters).");
    await expect(page.getByLabel("Title")).toHaveValue("Changed");
    const [campaign] = await campaignsOf(page);
    expect(campaign.title).toBe("Spring Hyrox Open");
  });

  test("keeps a deadline that has passed, but won't set a new one", async ({ page }) => {
    const passed = isoDate(-10);
    const id = await createCampaign(page, passed);
    await gotoHydrated(page, `/dashboard/campaigns/${id}/edit`);
    await expect(page.getByLabel("Deadline")).toHaveAttribute("min", passed);

    await page.getByLabel("Title").fill("Renamed");
    await save(page).click();
    await expect(page).toHaveURL("/dashboard");
    let [campaign] = await campaignsOf(page);
    expect(campaign).toMatchObject({ title: "Renamed", deadline: passed });

    await gotoHydrated(page, `/dashboard/campaigns/${id}/edit`);
    await page.getByLabel("Deadline").fill(isoDate(-1));
    await skipBrowserValidation(page);
    await save(page).click();
    await expect(alert(page)).toHaveText("Pick a deadline from today on, or leave it empty.");
    [campaign] = await campaignsOf(page);
    expect(campaign.deadline).toBe(passed);
  });

  test("deletes a campaign from its edit page", async ({ page }) => {
    const id = await createCampaign(page);
    await gotoHydrated(page, `/dashboard/campaigns/${id}/edit`);
    await main(page).getByRole("button", { name: "Delete campaign" }).click();

    await expect(page).toHaveURL("/dashboard");
    await expect(main(page).getByText("No campaigns yet")).toBeVisible();
    expect(await campaignsOf(page)).toEqual([]);
  });

  test("deletes a campaign straight from the dashboard", async ({ page }) => {
    await createCampaign(page);
    await gotoHydrated(page, "/dashboard");
    const item = main(page).getByRole("listitem").filter({ hasText: "Spring Hyrox Open" });
    await item.getByRole("button", { name: "Delete Spring Hyrox Open" }).click();

    await expect(main(page).getByText("No campaigns yet")).toBeVisible();
    expect(await campaignsOf(page)).toEqual([]);
  });

  test("another brand's campaign and unknown ids are not found", async ({ page, browser }) => {
    const other = await browser.newPage();
    await signUp(other, test.info(), { accountType: "Brand" });
    await completeBrandOnboarding(other);
    const othersId = await createCampaign(other);

    for (const id of [othersId, crypto.randomUUID(), "not-a-uuid"]) {
      const response = await page.goto(`/dashboard/campaigns/${id}/edit`);
      expect(response?.status(), id).toBe(404);
    }
    await other.close();
  });

  test("saving a campaign deleted meanwhile says it's gone", async ({ page }) => {
    const id = await createCampaign(page);
    await gotoHydrated(page, `/dashboard/campaigns/${id}/edit`);
    // Deleted elsewhere (e.g. another tab) while the form is open.
    const deleted = await rest(`campaigns?id=eq.${id}`, {
      method: "DELETE",
      token: await accessToken(page.context()),
    });
    expect(deleted.status).toBe(204);

    await page.getByLabel("Title").fill("Changed");
    await save(page).click();
    await expect(alert(page)).toHaveText("This campaign no longer exists.");
    await expect(page.getByLabel("Title")).toHaveValue("Changed");
  });

  test("guests are sent to sign in", async ({ page }) => {
    const id = await createCampaign(page);
    await page.context().clearCookies();
    await page.goto(`/dashboard/campaigns/${id}/edit`);
    await expect(page).toHaveURL("/sign-in");
  });
});
