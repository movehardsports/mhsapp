import { expect, type Page, test } from "@playwright/test";
import { gotoHydrated } from "./hydration";

const form = (page: Page) => page.getByRole("main").locator("form");

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, "/sign-in");
});

test("shows the sign in page", async ({ page }) => {
  await expect(page).toHaveTitle("Sign in");
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
});

test("has email and password fields", async ({ page }) => {
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password");
});

test("submitting keeps the form data out of the URL", async ({ page }) => {
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByLabel("Password").fill("secret123");
  await form(page).getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/sign-in");
});

test("links to forgot password", async ({ page }) => {
  const link = page.getByRole("main").getByRole("link", { name: "Forgot password?" });
  await expect(link).toHaveAttribute("href", "/reset-password");
});

test("links to sign up", async ({ page }) => {
  const link = page.getByRole("main").getByRole("link", { name: "Sign up" });
  await expect(link).toHaveAttribute("href", "/sign-up");
});
