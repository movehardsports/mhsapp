import { expect, type Page, type TestInfo } from "@playwright/test";
import { gotoHydrated } from "./hydration";
import { confirmationLinkPath, uniqueEmail } from "./mailpit";

export const TEST_PASSWORD = "secret123";

// Signs up through the real form and returns the new account's email. With `confirm`, it also
// opens the emailed link and confirms, which signs the page in; callers that need a guest
// clear cookies afterwards.
export async function signUp(
  page: Page,
  testInfo: TestInfo,
  {
    accountType = "Athlete",
    confirm = true,
  }: { accountType?: "Athlete" | "Brand"; confirm?: boolean } = {}
) {
  const email = uniqueEmail(testInfo);
  await gotoHydrated(page, "/sign-up");
  await page.getByText(accountType, { exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("Confirm password").fill(TEST_PASSWORD);
  await page.getByRole("main").getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");

  if (confirm) {
    await page.goto(await confirmationLinkPath(email));
    await page.getByRole("main").getByRole("button", { name: "Confirm email" }).click();
    await expect(page).toHaveURL(/\/onboarding\//);
  }
  return email;
}

// The header's account area: the desktop header, or the mobile menu (opened here) on phones.
export async function accountArea(page: Page) {
  const openMenu = page.getByRole("button", { name: "Open menu" });
  if (!(await openMenu.isVisible())) return page.getByRole("banner");

  // The menu opens from a React click handler: a click before hydration does nothing, so retry.
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(async () => {
    await openMenu.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass();
  return menu;
}
