import { expect, type Page, test } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { accessToken, rest, userId } from "./supabase";

const main = (page: Page) => page.getByRole("main");

// YYYY-MM-DD in UTC, `days` from today; the app uses the UTC date too.
const isoDate = (days = 0) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// Other tests create campaigns in the same database, so every title here is unique.
const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`;

// Creates a campaign for the signed-in brand straight through the Data API; the database
// doesn't check that the deadline is in the future, so this can make a closed one too.
async function createCampaign(
  page: Page,
  { title, deadline = null }: { title: string; deadline?: string | null }
) {
  const response = await rest("campaigns", {
    method: "POST",
    token: await accessToken(page.context()),
    body: {
      brand_id: await userId(page.context()),
      type: "event",
      title,
      description: "Race day in Warsaw.\nBring your crew.",
      sports: ["hyrox"],
      deadline,
    },
  });
  expect(response.status).toBe(201);
  return title;
}

test.describe("as a guest", () => {
  let open: string;
  let closed: string;
  let openId: string;
  let closedId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(page);
    open = await createCampaign(page, { title: uniqueTitle("Open"), deadline: isoDate(30) });
    closed = await createCampaign(page, { title: uniqueTitle("Closed"), deadline: isoDate(-1) });
    const ids = await (
      await rest(`campaigns?brand_id=eq.${await userId(page.context())}&select=id,title`)
    ).json();
    openId = ids.find((c: { title: string }) => c.title === open).id;
    closedId = ids.find((c: { title: string }) => c.title === closed).id;
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
  }
});
