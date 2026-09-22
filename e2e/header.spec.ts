import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("logo links to the home page", async ({ page }) => {
  const logo = page.getByRole("banner").getByRole("link", { name: "MHS" });
  await expect(logo).toHaveAttribute("href", "/");
});

test("shows main navigation links", async ({ page }) => {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/explore");
  await expect(header.getByRole("link", { name: "For Athletes" })).toHaveAttribute("href", "/athletes");
  await expect(header.getByRole("link", { name: "For Brands" })).toHaveAttribute("href", "/brands");
});

test("shows sign in and sign up links", async ({ page }) => {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  await expect(header.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up");
});

test("main navigation is centered in the header", async ({ page }) => {
  const header = await page.getByRole("banner").boundingBox();
  const nav = await page.getByRole("banner").getByRole("navigation").boundingBox();
  const headerCenter = header!.x + header!.width / 2;
  const navCenter = nav!.x + nav!.width / 2;
  expect(Math.abs(navCenter - headerCenter)).toBeLessThan(1);
});

test("hamburger button is hidden on desktop", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
});
