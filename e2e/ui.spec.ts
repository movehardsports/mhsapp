import { expect, test } from "@playwright/test";

// App-wide UI behaviour that isn't tied to one page.

test("a skip link jumps past the header to the page content", async ({ page, browserName }) => {
  await page.goto("/sign-in");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  // Visually hidden (a 1px clipped box, `sr-only`) until it gets focus.
  const width = async () => (await skipLink.boundingBox())!.width;
  expect(await width()).toBeLessThanOrEqual(1);

  // Safari only tabs to links with Option+Tab by default.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(skipLink).toBeFocused();
  await expect.poll(width).toBeGreaterThan(1);

  await page.keyboard.press("Enter");
  await expect(page.locator("#content")).toBeFocused();
  // The next Tab lands in the page, not in the header.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
});

test("text inputs show an outline when focused", async ({ page }) => {
  await page.goto("/sign-in");
  const email = page.getByLabel("Email");
  await expect(email).toHaveCSS("outline-style", "none");
  await email.focus();
  await expect(email).toHaveCSS("outline-style", "solid");
});

test("native controls and the browser UI follow the colour scheme", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light dark");
  const themeColor = (scheme: string) =>
    page.locator(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`);
  await expect(themeColor("light")).toHaveAttribute("content", "#ffffff");
  await expect(themeColor("dark")).toHaveAttribute("content", "#0a0a0a");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(10, 10, 10)");
});
