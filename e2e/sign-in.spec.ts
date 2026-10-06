import { expect, type Page, test } from "@playwright/test";
import { accountArea, completeBrandOnboarding, signUp, TEST_PASSWORD } from "./auth";
import { gotoHydrated } from "./hydration";

const form = (page: Page) => page.getByRole("main").locator("form");

async function signIn(page: Page, email: string, password: string) {
  await gotoHydrated(page, "/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await form(page).getByRole("button", { name: "Sign in" }).click();
}

test.describe("page", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, "/sign-in");
  });

  test("shows the sign in page", async ({ page }) => {
    await expect(page).toHaveTitle("Sign in | MHS");
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  });

  test("has email and password fields", async ({ page }) => {
    await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
    await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
    await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  test("links to forgot password", async ({ page }) => {
    const link = page.getByRole("main").getByRole("link", { name: "Forgot password?" });
    await expect(link).toHaveAttribute("href", "/reset-password");
  });

  test("links to sign up", async ({ page }) => {
    const link = page.getByRole("main").getByRole("link", { name: "Sign up" });
    await expect(link).toHaveAttribute("href", "/sign-up");
  });
});

test("an unknown email gets the same error as a wrong password", async ({ page }, testInfo) => {
  const email = await signUp(page, testInfo);
  await page.context().clearCookies();

  await signIn(page, email, "wrong-password");
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toHaveText("Wrong email or password.");
  // No form data (like the password) ends up in the URL, and the email survives the error.
  await expect(page).toHaveURL("/sign-in");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");

  await signIn(page, `nobody-${email}`, TEST_PASSWORD);
  await expect(alert).toHaveText("Wrong email or password.");
});

test("an unconfirmed account is asked to confirm its email", async ({ page }, testInfo) => {
  const email = await signUp(page, testInfo, { confirm: false });

  await signIn(page, email, TEST_PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Confirm your email first");
  await expect(page).toHaveURL("/sign-in");

  // Only the right password reveals that the account exists but is unconfirmed.
  await signIn(page, email, "wrong-password");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Wrong email or password.");
});

test("signing in shows the Dashboard button, which leads to the onboarding until it's done", async ({
  page,
}, testInfo) => {
  const email = await signUp(page, testInfo);
  await page.context().clearCookies();

  await signIn(page, email, TEST_PASSWORD);
  // Onboarding isn't done yet, so signing in continues there.
  await expect(page).toHaveURL("/onboarding/athlete");
  let account = await accountArea(page);
  // The header shows only the Dashboard button: no email, no sign-in or sign-up links.
  await expect(account.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(account.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(account.getByRole("link", { name: "Sign up" })).toHaveCount(0);
  await expect(page.getByRole("banner").getByText(email)).toHaveCount(0);

  // Skipping the onboarding: the session survives a full page load elsewhere, since it lives
  // in cookies, and the Dashboard button brings the user back to the onboarding.
  await page.goto("/");
  account = await accountArea(page);
  await account.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/onboarding/athlete");
});

test("after onboarding, signing in goes home and the dashboard signs out", async ({
  page,
}, testInfo) => {
  const email = await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  await page.context().clearCookies();

  await signIn(page, email, TEST_PASSWORD);
  await expect(page).toHaveURL("/");

  let account = await accountArea(page);
  await account.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/");
  account = await accountArea(page);
  await expect(account.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(account.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});
