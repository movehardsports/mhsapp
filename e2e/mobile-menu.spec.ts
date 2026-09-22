import { expect, type Page, test } from "@playwright/test";

const menu = (page: Page) => page.getByRole("dialog", { name: "Menu" });
const openButton = (page: Page) => page.getByRole("button", { name: "Open menu" });
const closeButton = (page: Page) => page.getByRole("button", { name: "Close menu" });
const exploreToggle = (page: Page) => menu(page).locator("summary", { hasText: "Explore" });

async function openMenu(page: Page) {
  await openButton(page).click();
  await expect(menu(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows the hamburger instead of the desktop navigation", async ({ page }) => {
  await expect(openButton(page)).toBeVisible();
  await expect(page.getByRole("banner").getByRole("navigation")).toBeHidden();
  await expect(menu(page)).toBeHidden();
});

test("opens as a full-screen overlay with all links", async ({ page }) => {
  await openMenu(page);

  const box = await menu(page).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });

  await expect(exploreToggle(page)).toBeVisible();
  for (const name of ["Events", "For Athletes", "For Brands", "Sign in", "Sign up"]) {
    await expect(menu(page).getByRole("link", { name, exact: true })).toBeVisible();
  }
});

test("lists menu sections in order: Explore, Events, For Athletes, For Brands", async ({ page }) => {
  await openMenu(page);
  const items = menu(page).getByRole("navigation").locator(":scope > details > summary, :scope > a");
  await expect(items).toHaveText(["Explore", "Events", "For Athletes", "For Brands"]);
});

test("Events links to the events page", async ({ page }) => {
  await openMenu(page);
  await expect(menu(page).getByRole("link", { name: "Events", exact: true })).toHaveAttribute("href", "/events");
});

test("Explore is collapsed by default and expands to Athletes and Brands", async ({ page }) => {
  await openMenu(page);
  const athletes = menu(page).getByRole("link", { name: "Athletes", exact: true });
  const brands = menu(page).getByRole("link", { name: "Brands", exact: true });
  await expect(athletes).toBeHidden();
  await expect(brands).toBeHidden();

  await exploreToggle(page).click();
  await expect(athletes).toHaveAttribute("href", "/explore/athletes");
  await expect(athletes).toBeVisible();
  await expect(brands).toHaveAttribute("href", "/explore/brands");
  await expect(brands).toBeVisible();

  await expect(athletes).toHaveCSS("text-transform", "uppercase");
  await expect(brands).toHaveCSS("text-transform", "uppercase");

  await exploreToggle(page).click();
  await expect(athletes).toBeHidden();
});

test("moves focus to the close button when opened", async ({ page }) => {
  await openMenu(page);
  await expect(closeButton(page)).toBeFocused();
});

test("locks page scroll while open and restores it after closing", async ({ page }) => {
  const htmlOverflow = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).overflow);

  await openMenu(page);
  expect(await htmlOverflow()).toBe("hidden");

  await closeButton(page).click();
  expect(await htmlOverflow()).not.toBe("hidden");
});

test("closes with Escape and returns focus to the hamburger", async ({ page }) => {
  await openMenu(page);
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(openButton(page)).toBeFocused();
});

test("closes with the close button and returns focus to the hamburger", async ({ page }) => {
  await openMenu(page);
  await closeButton(page).click();
  await expect(menu(page)).toBeHidden();
  await expect(openButton(page)).toBeFocused();
});

test("closes when the logo is clicked on the current page", async ({ page }) => {
  await openMenu(page);
  await menu(page).getByRole("link", { name: "MHS" }).click();
  await expect(menu(page)).toBeHidden();
});

test("closes after navigating with a menu link", async ({ page }) => {
  await openMenu(page);
  await exploreToggle(page).click();
  await menu(page).getByRole("link", { name: "Athletes", exact: true }).click();
  await expect(page).toHaveURL("/explore/athletes");
  await expect(menu(page)).toBeHidden();
});

test("Tab never moves focus to the page behind the menu", async ({ page }) => {
  await openMenu(page);

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    // Focus is either inside the menu or has left for the browser UI (body), never the page.
    const focusIsAllowed = await page.evaluate(() => {
      const active = document.activeElement;
      return active === document.body || !!document.getElementById("mobile-menu")?.contains(active);
    });
    expect(focusIsAllowed).toBe(true);
  }
});

test("closes when the screen grows to desktop and focuses the logo", async ({ page }) => {
  await openMenu(page);
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(menu(page)).toBeHidden();
  await expect(page.getByRole("banner").getByRole("link", { name: "MHS" }).first()).toBeFocused();
});

// Needs real pages: /explore/athletes is a 404 today, so back/forward does a full reload,
// which resets the menu anyway and the test would pass without checking anything.
test.fixme("stays closed after browser back and forward", async ({ page }) => {
  await openMenu(page);
  await exploreToggle(page).click();
  await menu(page).getByRole("link", { name: "Athletes", exact: true }).click();
  await expect(page).toHaveURL("/explore/athletes");

  await openMenu(page);
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(menu(page)).toBeHidden();

  await page.goForward();
  await expect(page).toHaveURL("/explore/athletes");
  await expect(menu(page)).toBeHidden();
});
