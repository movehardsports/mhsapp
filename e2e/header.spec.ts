import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("logo links to the home page", async ({ page }) => {
  const logo = page.getByRole("banner").getByRole("link", { name: "MHS" });
  await expect(logo).toHaveAttribute("href", "/");
});

test("shows main navigation links", async ({ page }) => {
  const header = page.getByRole("banner");
  await expect(header.getByRole("button", { name: "Explore" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Events" })).toHaveAttribute("href", "/events");
  await expect(header.getByRole("link", { name: "For Athletes" })).toHaveAttribute("href", "/athletes");
  await expect(header.getByRole("link", { name: "For Brands" })).toHaveAttribute("href", "/brands");
});

test("shows main navigation in order: Explore, Events, For Athletes, For Brands", async ({ page }) => {
  const items = page.getByRole("banner").getByRole("navigation").locator(":scope > div > button, :scope > a");
  await expect(items).toHaveText(["Explore", "Events", "For Athletes", "For Brands"]);
});

test("shows sign in and sign up links", async ({ page }) => {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  await expect(header.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up");
});

test("sign in, sign up and Explore links share one corner radius", async ({ page }) => {
  const header = page.getByRole("banner");
  await header.getByRole("button", { name: "Explore" }).click();
  const buttons = [
    header.getByRole("link", { name: "Sign in" }),
    header.getByRole("link", { name: "Sign up" }),
    page.locator("#explore-menu").getByRole("link", { name: "Athletes", exact: true }),
    page.locator("#explore-menu").getByRole("link", { name: "Brands", exact: true }),
  ];
  const radii = await Promise.all(buttons.map((b) => b.evaluate((el) => getComputedStyle(el).borderRadius)));
  expect(radii[0]).not.toBe("0px");
  expect(new Set(radii).size, `radii: ${radii.join(", ")}`).toBe(1);
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

test.describe("Explore menu", () => {
  const exploreButton = (page: Page) => page.getByRole("button", { name: "Explore" });
  const exploreMenu = (page: Page) => page.locator("#explore-menu");

  test("is closed by default", async ({ page }) => {
    await expect(exploreMenu(page)).toBeHidden();
  });

  test("opens with Athletes and Brands", async ({ page }) => {
    await exploreButton(page).click();
    await expect(exploreMenu(page)).toBeVisible();

    const menu = exploreMenu(page);
    await expect(menu.getByRole("link", { name: "Athletes", exact: true })).toHaveAttribute("href", "/explore/athletes");
    await expect(menu.getByRole("link", { name: "Brands", exact: true })).toHaveAttribute("href", "/explore/brands");

  });

  test("top edge lines up with the header's bottom border", async ({ page }) => {
    await exploreButton(page).click();
    const header = await page.getByRole("banner").boundingBox();
    const box = await exploreMenu(page).boundingBox();
    // The header's 1px bottom border is its last pixel row; the panel's top border sits on it.
    expect(box!.y).toBe(header!.y + header!.height - 1);
  });

  test("shows Athletes and Brands in uppercase", async ({ page }) => {
    await exploreButton(page).click();
    for (const name of ["Athletes", "Brands"]) {
      const link = exploreMenu(page).getByRole("link", { name, exact: true });
      await expect(link).toHaveCSS("text-transform", "uppercase");
    }
  });

  test("puts Athletes on the left and Brands on the right", async ({ page }) => {
    await exploreButton(page).click();
    const athletes = await exploreMenu(page).getByRole("link", { name: "Athletes", exact: true }).boundingBox();
    const brands = await exploreMenu(page).getByRole("link", { name: "Brands", exact: true }).boundingBox();
    expect(athletes!.x).toBeLessThan(brands!.x);
    expect(Math.abs(athletes!.y - brands!.y)).toBeLessThan(1);
  });

  test("is exposed to screen readers as a group named Explore", async ({ page }) => {
    await exploreButton(page).click();
    await expect(page.getByRole("group", { name: "Explore" })).toBeVisible();
  });

  test("closes when the screen shrinks to mobile and stays closed after growing back", async ({ page }) => {
    const size = page.viewportSize()!;
    await exploreButton(page).click();
    await expect(exploreMenu(page)).toBeVisible();

    // On mobile the panel is hidden by CSS either way, so check the popover state itself.
    await page.setViewportSize({ width: 390, height: size.height });
    await expect
      .poll(() => exploreMenu(page).evaluate((el) => el.matches(":popover-open")))
      .toBe(false);

    await page.setViewportSize(size);
    await expect(exploreMenu(page)).toBeHidden();
  });

  test("dims and lightly blurs the page below the header", async ({ page }) => {
    await exploreButton(page).click();
    const backdrop = await exploreMenu(page).evaluate((el) => {
      const style = getComputedStyle(el, "::backdrop");
      return { top: style.top, background: style.backgroundColor, filter: style.backdropFilter };
    });
    const header = await page.getByRole("banner").boundingBox();

    expect(backdrop.top).toBe(`${header!.y + header!.height}px`);
    expect(backdrop.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(backdrop.filter).toMatch(/blur\(/);
  });

  test("closes when the Explore button is clicked again", async ({ page }) => {
    await exploreButton(page).click();
    await expect(exploreMenu(page)).toBeVisible();
    await exploreButton(page).click();
    await expect(exploreMenu(page)).toBeHidden();
  });

  test("closes when clicking outside", async ({ page }) => {
    await exploreButton(page).click();
    await expect(exploreMenu(page)).toBeVisible();
    await page.mouse.click(10, 400);
    await expect(exploreMenu(page)).toBeHidden();
  });

  test("works with the keyboard and returns focus on Escape", async ({ page, browserName }) => {
    await exploreButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(exploreMenu(page)).toBeVisible();

    // Safari only tabs to links with Option+Tab by default.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(exploreMenu(page).getByRole("link", { name: "Athletes", exact: true })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(exploreMenu(page)).toBeHidden();
    await expect(exploreButton(page)).toBeFocused();
  });

  // /explore/athletes is a 404 today, which forces a full page reload, so this passes
  // even if the close-on-navigation code breaks. It becomes a real check once the page exists.
  test("closes after navigating with a menu link", async ({ page }) => {
    await exploreButton(page).click();
    await exploreMenu(page).getByRole("link", { name: "Athletes", exact: true }).click();
    await expect(page).toHaveURL("/explore/athletes");
    await expect(exploreMenu(page)).toBeHidden();
  });
});
