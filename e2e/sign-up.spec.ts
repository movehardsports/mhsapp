import { expect, type Page, test } from "@playwright/test";

const form = (page: Page) => page.getByRole("main").locator("form");
const confirmIsValid = (page: Page) =>
  page.getByLabel("Confirm password").evaluate((el) => (el as HTMLInputElement).validity.valid);

async function fillValidForm(page: Page, accountType: "Athlete" | "Brand") {
  // The radio itself is visually hidden; users click its tile.
  await page.getByText(accountType, { exact: true }).click();
  await expect(page.getByLabel(accountType)).toBeChecked();
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByLabel("Password", { exact: true }).fill("secret123");
  await page.getByLabel("Confirm password").fill("secret123");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-up");
});

test("shows the sign up page", async ({ page }) => {
  await expect(page).toHaveTitle("Sign up");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("has account type, email and password fields", async ({ page }) => {
  const accountType = page.getByRole("group", { name: "Account type" });
  await expect(accountType.getByRole("radio", { name: "Athlete" })).toBeAttached();
  await expect(accountType.getByRole("radio", { name: "Brand" })).toBeAttached();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.getByLabel("Confirm password")).toHaveAttribute("type", "password");
});

test("flags mismatched passwords", async ({ page }) => {
  await page.getByLabel("Password", { exact: true }).fill("secret123");
  await page.getByLabel("Confirm password").fill("secret124");
  expect(await confirmIsValid(page)).toBe(false);

  await page.getByLabel("Confirm password").fill("secret123");
  expect(await confirmIsValid(page)).toBe(true);

  // Editing the first password re-checks the confirmation too.
  await page.getByLabel("Password", { exact: true }).fill("secret1234");
  expect(await confirmIsValid(page)).toBe(false);
});

for (const [accountType, path] of [
  ["Athlete", "/onboarding/athlete"],
  ["Brand", "/onboarding/brand"],
] as const) {
  test(`signing up as ${accountType} continues to its onboarding`, async ({ page }) => {
    await fillValidForm(page, accountType);
    await form(page).getByRole("button", { name: "Sign up" }).click();
    // No form data (like the password) ends up in the URL.
    await expect(page).toHaveURL(path);
  });
}

test("does not continue while the form is invalid", async ({ page }) => {
  await form(page).getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/sign-up");
});

test("links to sign in", async ({ page }) => {
  const link = page.getByRole("main").getByRole("link", { name: "Sign in" });
  await expect(link).toHaveAttribute("href", "/sign-in");
});
