import { expect, type Page, test } from "@playwright/test";
import { gotoHydrated } from "./hydration";

const submit = (page: Page) => page.getByRole("main").getByRole("button", { name: "Continue" });
const sportsGroup = (page: Page) => page.getByRole("group", { name: "Sports" });
const allSports = [
  "Triathlon / Ultra",
  "Hyrox",
  "OCR / Ninja",
  "Fitness / Calisthenics",
  "Parkour / 3run",
  "Bouldering / Climbing",
  "MTB / Freeride",
  "BMX",
  "Skateboard",
  "Motorsport",
  "Snowboard",
  "Freeski",
  "Surf",
  "Kitesurf",
  "Wakeboard",
  "Kayak",
];

// The checkbox itself is visually hidden; users click its tag.
async function pickSport(page: Page, name: string) {
  await sportsGroup(page).getByText(name, { exact: true }).click();
  await expect(sportsGroup(page).getByLabel(name)).toBeChecked();
}

async function expectAllSports(page: Page) {
  await expect(sportsGroup(page).getByRole("checkbox")).toHaveCount(allSports.length);
  for (const name of allSports) {
    await expect(sportsGroup(page).getByText(name, { exact: true })).toBeVisible();
  }
}

// The first checkbox carries the group's "at least one" rule.
const sportsAreValid = (page: Page) =>
  sportsGroup(page).getByRole("checkbox").first().evaluate((el) => (el as HTMLInputElement).validity.valid);

test.describe("athlete onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, "/onboarding/athlete");
  });

  test("shows sports in their themed order, in uppercase", async ({ page }) => {
    await expect(sportsGroup(page).locator("label")).toHaveText(allSports, { useInnerText: false });
    await expect(sportsGroup(page).locator("label").first()).toHaveCSS("text-transform", "uppercase");
  });

  test("groups sports under labelled themes", async ({ page }) => {
    const theme = (name: string) => sportsGroup(page).getByRole("group", { name });
    await expect(theme("Endurance").getByRole("checkbox")).toHaveCount(3);
    await expect(theme("Movement").getByRole("checkbox")).toHaveCount(3);
    await expect(theme("Wheels").getByRole("checkbox")).toHaveCount(4);
    await expect(theme("Snow").getByRole("checkbox")).toHaveCount(2);
    await expect(theme("Water").getByRole("checkbox")).toHaveCount(4);
    await expect(theme("Water").getByLabel("Kitesurf")).toBeAttached();
  });

  test("shows the athlete fields", async ({ page }) => {
    await expect(page).toHaveTitle("Set up your athlete profile");
    await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible();
    for (const label of ["First name", "Last name", "Nickname", "Age", "City"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByLabel("Age")).toHaveAttribute("type", "number");
    await expectAllSports(page);
  });

  test("stays on the page while fields are empty", async ({ page }) => {
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/athlete");
  });

  test("requires at least one sport, and unpicking the last one flags it again", async ({ page }) => {
    expect(await sportsAreValid(page)).toBe(false);
    await pickSport(page, "Snowboard");
    expect(await sportsAreValid(page)).toBe(true);
    await sportsGroup(page).getByText("Snowboard", { exact: true }).click();
    await expect(sportsGroup(page).getByLabel("Snowboard")).not.toBeChecked();
    expect(await sportsAreValid(page)).toBe(false);
  });

  test("continues to the home page once filled in", async ({ page }) => {
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Doe");
    await page.getByLabel("Nickname").fill("JD");
    await page.getByLabel("Age").fill("24");
    await page.getByLabel("City").fill("Warsaw");
    await pickSport(page, "Bouldering / Climbing");
    await pickSport(page, "Parkour / 3run");
    await submit(page).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("brand onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, "/onboarding/brand");
  });

  test("shows the brand fields", async ({ page }) => {
    await expect(page).toHaveTitle("Set up your brand profile");
    await expect(page.getByRole("heading", { name: "Tell us about your brand" })).toBeVisible();
    await expect(page.getByLabel("Brand name")).toBeVisible();
    await expectAllSports(page);
  });

  test("stays on the page while fields are empty", async ({ page }) => {
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/brand");
  });

  test("stays on the page without a sport", async ({ page }) => {
    await page.getByLabel("Brand name").fill("Move Hard");
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/brand");
  });

  test("continues to the home page once filled in", async ({ page }) => {
    await page.getByLabel("Brand name").fill("Move Hard");
    await pickSport(page, "Triathlon / Ultra");
    await submit(page).click();
    await expect(page).toHaveURL("/");
  });
});
