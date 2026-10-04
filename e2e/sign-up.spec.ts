import { expect, type Page, test } from "@playwright/test";
import { gotoHydrated } from "./hydration";
import { confirmationLinkPath, uniqueEmail } from "./mailpit";

const form = (page: Page) => page.getByRole("main").locator("form");
const confirmIsValid = (page: Page) =>
  page.getByLabel("Confirm password").evaluate((el) => (el as HTMLInputElement).validity.valid);

async function fillValidForm(page: Page, accountType: "Athlete" | "Brand", email: string) {
  // The radio itself is visually hidden; users click its tile.
  await page.getByText(accountType, { exact: true }).click();
  await expect(page.getByLabel(accountType)).toBeChecked();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("secret123");
  await page.getByLabel("Confirm password").fill("secret123");
}

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, "/sign-up");
});

test("shows the sign up page", async ({ page }) => {
  await expect(page).toHaveTitle("Sign up | MHS");
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
  test(`signing up as ${accountType} confirms the email, then continues to its onboarding`, async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail(testInfo);
    await fillValidForm(page, accountType, email);
    await form(page).getByRole("button", { name: "Sign up" }).click();

    const status = page.getByRole("status");
    await expect(status).toContainText("Check your email");
    await expect(status).toContainText(email);
    // No form data (like the password) ends up in the URL.
    await expect(page).toHaveURL("/sign-up");

    // Opening the link alone confirms nothing (mail scanners open links too); the button does.
    await page.goto(await confirmationLinkPath(email));
    await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Confirm email" }).click();
    await expect(page).toHaveURL(path);
  });
}

test("checks the form on the server too", async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo);
  await fillValidForm(page, "Brand", email);
  // Skip the browser's checks, like a form posted before hydration or by hand.
  await form(page).evaluate((el) => el.setAttribute("novalidate", ""));
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("short");
  await form(page).getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Use at least 8 characters for your password."
  );
  // What the user typed survives the error, except the password.
  await expect(page.getByLabel("Brand")).toBeChecked();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
});

test("a confirmation link can't be used twice", async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo);
  await fillValidForm(page, "Athlete", email);
  await form(page).getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  const linkPath = await confirmationLinkPath(email);

  // Opening the link (as a mail scanner would) leaves the token usable.
  await page.goto(linkPath);
  await page.goto(linkPath);
  await page.getByRole("main").getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL("/onboarding/athlete");

  await page.goto(linkPath);
  await page.getByRole("main").getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL("/sign-up/confirm-error");
});

test("an invalid confirmation link explains what to do", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=not-a-real-token&type=email");
  await page.getByRole("main").getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL("/sign-up/confirm-error");
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
});

test("a confirmation link without a token goes straight to the error page", async ({ page }) => {
  await page.goto("/auth/confirm");
  await expect(page).toHaveURL("/sign-up/confirm-error");
});

test("does not continue while the form is invalid", async ({ page }) => {
  await form(page).getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/sign-up");
});

test("links to sign in", async ({ page }) => {
  const link = page.getByRole("main").getByRole("link", { name: "Sign in" });
  await expect(link).toHaveAttribute("href", "/sign-in");
});
