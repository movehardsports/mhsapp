import { expect, type Page, test } from "@playwright/test";

const submit = (page: Page) => page.getByRole("main").getByRole("button", { name: "Continue" });

test.describe("athlete onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/onboarding/athlete");
  });

  test("shows the athlete fields", async ({ page }) => {
    await expect(page).toHaveTitle("Set up your athlete profile");
    await expect(page.getByRole("heading", { name: "Set up your athlete profile" })).toBeVisible();
    for (const label of ["First name", "Last name", "Nickname", "Age", "City", "Sport"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByLabel("Age")).toHaveAttribute("type", "number");
  });

  test("stays on the page while fields are empty", async ({ page }) => {
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/athlete");
  });

  test("continues to the home page once filled in", async ({ page }) => {
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Doe");
    await page.getByLabel("Nickname").fill("JD");
    await page.getByLabel("Age").fill("24");
    await page.getByLabel("City").fill("Warsaw");
    await page.getByLabel("Sport").fill("Climbing");
    await submit(page).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("brand onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/onboarding/brand");
  });

  test("shows the brand fields", async ({ page }) => {
    await expect(page).toHaveTitle("Set up your brand profile");
    await expect(page.getByRole("heading", { name: "Tell us about your brand" })).toBeVisible();
    await expect(page.getByLabel("Brand name")).toBeVisible();
    await expect(page.getByLabel("Sport")).toBeVisible();
  });

  test("stays on the page while fields are empty", async ({ page }) => {
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/brand");
  });

  test("continues to the home page once filled in", async ({ page }) => {
    await page.getByLabel("Brand name").fill("Move Hard");
    await page.getByLabel("Sport").fill("Running");
    await submit(page).click();
    await expect(page).toHaveURL("/");
  });
});
