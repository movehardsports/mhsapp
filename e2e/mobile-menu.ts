import { expect, type Page } from "@playwright/test";

export const mobileMenu = (page: Page) => page.getByRole("dialog", { name: "Menu" });

// Opens the mobile menu. It opens from a React click handler, so a click before hydration does
// nothing: retry until it's open.
export async function openMobileMenu(page: Page) {
  const menu = mobileMenu(page);
  await expect(async () => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass();
  return menu;
}
