import { expect, test } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { createCampaign, isoDate } from "./campaigns";
import { main } from "./page";
import { accessToken, rest, userId } from "./supabase";

// Other tests create campaigns in the same database, so every title here is unique. The list
// shows the newest 50 campaigns; these are created just before each test reads it.
const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`;
const description = "Race day in Warsaw.\nBring your crew.";

test.describe("as a guest", () => {
  let open: string;
  let closed: string;
  let openId: string;
  let closedId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(page);
    open = uniqueTitle("Open");
    closed = uniqueTitle("Closed");
    openId = await createCampaign(page, { title: open, description, deadline: isoDate(30) });
    closedId = await createCampaign(page, { title: closed, description, deadline: isoDate(-1) });
    await page.context().clearCookies();
  });

  test("the list shows open campaigns with their brand and links to them", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page).toHaveTitle("Campaigns | MHS");
    await expect(main(page).getByRole("heading", { name: "Campaigns" })).toBeVisible();

    const item = main(page).getByRole("listitem").filter({ hasText: open });
    await expect(item).toContainText("Move Hard");
    await expect(item).toContainText("Event");
    await expect(item).toContainText("Hyrox");
    await expect(item).toContainText("Apply by");
    await expect(main(page).getByText(closed)).toHaveCount(0);

    // The whole card is clickable, not only the title.
    await expect(item.getByRole("link")).toHaveAccessibleName(open);
    // The title link covers the whole card, so click its bottom-right corner, away from the title.
    const box = (await item.boundingBox())!;
    await item.click({ position: { x: box.width - 5, y: box.height - 5 } });
    await expect(page).toHaveURL(`/campaigns/${openId}`);
  });

  test("the campaign page shows the whole campaign", async ({ page }) => {
    await page.goto(`/campaigns/${openId}`);
    await expect(page).toHaveTitle(`${open} | MHS`);
    await expect(main(page).getByRole("heading", { name: open })).toBeVisible();
    await expect(main(page)).toContainText("Move Hard");
    await expect(main(page)).toContainText("Event");
    await expect(main(page)).toContainText("Hyrox");
    // Line breaks in the description stay line breaks.
    const description = main(page).getByText("Race day in Warsaw.");
    await expect(description).toHaveCSS("white-space", "pre-line");
    // toHaveText normalises whitespace, so compare the rendered text, where newlines remain.
    expect(await description.evaluate((el) => (el as HTMLElement).innerText)).toBe(
      "Race day in Warsaw.\nBring your crew."
    );
    await expect(main(page).getByText("Applications closed")).toHaveCount(0);
  });

  test("a campaign whose deadline has passed says applications are closed", async ({ page }) => {
    await page.goto(`/campaigns/${closedId}`);
    await expect(main(page).getByRole("heading", { name: closed })).toBeVisible();
    await expect(main(page).getByText("Applications closed")).toBeVisible();
  });
});

test("unknown and malformed campaign ids are a 404", async ({ page }) => {
  for (const id of [crypto.randomUUID(), "not-a-uuid"]) {
    const response = await page.goto(`/campaigns/${id}`);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page not found | MHS");
  }
});

test("long words and URLs wrap instead of widening the page", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  // The longest brand name the form allows, without spaces.
  const response = await rest(`brands?id=eq.${await userId(page.context())}`, {
    method: "PATCH",
    token: await accessToken(page.context()),
    body: { name: "W".repeat(100) },
  });
  expect(response.status).toBe(204);
  const id = await createCampaign(page, {
    title: uniqueTitle("Long words"),
    description: `Details: https://example.com/${"segment/".repeat(30)}end`,
  });

  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ["/campaigns", `/campaigns/${id}`]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
