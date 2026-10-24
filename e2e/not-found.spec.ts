import { expect, test } from "@playwright/test";

test("unknown pages show the app's 404 page with the header", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found | MHS");
  await expect(page.getByRole("banner")).toBeVisible();

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await main.getByRole("link", { name: "Browse campaigns" }).click();
  await expect(page).toHaveURL("/campaigns");
});

test("an unknown campaign shows the same page", async ({ page }) => {
  const response = await page.goto(`/campaigns/${crypto.randomUUID()}`);
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Page not found" })
  ).toBeVisible();
});
