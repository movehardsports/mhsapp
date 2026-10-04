import { expect, type Page, test } from "@playwright/test";
import { signUp } from "./auth";
import { gotoHydrated } from "./hydration";

const submit = (page: Page) => page.getByRole("main").getByRole("button", { name: "Continue" });
const alert = (page: Page) => page.getByRole("main").getByRole("alert");
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
  sportsGroup(page)
    .getByRole("checkbox")
    .first()
    .evaluate((el) => (el as HTMLInputElement).validity.valid);

// Skip the browser's checks, like a form posted before hydration or by hand.
const skipBrowserValidation = (page: Page) =>
  page
    .getByRole("main")
    .locator("form")
    .evaluate((form) => form.setAttribute("novalidate", ""));

async function fillAthlete(page: Page, { birthYear = "1998" } = {}) {
  await page.getByLabel("First name").fill("Jane");
  await page.getByLabel("Last name").fill("Doe");
  await page.getByLabel("Nickname").fill("JD");
  await page.getByLabel("Year of birth").fill(birthYear);
  await page.getByLabel("City").fill("Warsaw");
  await pickSport(page, "Bouldering / Climbing");
  await pickSport(page, "Parkour / 3run");
}

test.describe("access", () => {
  test("guests are sent to sign in", async ({ page }) => {
    await page.goto("/onboarding/athlete");
    await expect(page).toHaveURL("/sign-in");
    await page.goto("/onboarding/brand");
    await expect(page).toHaveURL("/sign-in");
  });

  test("a brand is sent to the brand onboarding", async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await page.goto("/onboarding/athlete");
    await expect(page).toHaveURL("/onboarding/brand");
  });

  test("an athlete is sent to the athlete onboarding", async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Athlete" });
    await page.goto("/onboarding/brand");
    await expect(page).toHaveURL("/onboarding/athlete");
  });
});

test.describe("athlete onboarding", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Athlete" });
    await gotoHydrated(page, "/onboarding/athlete");
  });

  test("shows the athlete fields", async ({ page }) => {
    await expect(page).toHaveTitle("Set up your athlete profile | MHS");
    await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible();
    for (const label of ["First name", "Last name", "Nickname", "Year of birth", "City"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByLabel("Year of birth")).toHaveAttribute("type", "number");
    await expectAllSports(page);
  });

  test("shows sports in their themed order, in uppercase", async ({ page }) => {
    await expect(sportsGroup(page).locator("label")).toHaveText(allSports, { useInnerText: false });
    await expect(sportsGroup(page).locator("label").first()).toHaveCSS(
      "text-transform",
      "uppercase"
    );
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

  test("stays on the page while fields are empty", async ({ page }) => {
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/athlete");
  });

  test("requires at least one sport, and unpicking the last one flags it again", async ({
    page,
  }) => {
    expect(await sportsAreValid(page)).toBe(false);
    await pickSport(page, "Snowboard");
    expect(await sportsAreValid(page)).toBe(true);
    await sportsGroup(page).getByText("Snowboard", { exact: true }).click();
    await expect(sportsGroup(page).getByLabel("Snowboard")).not.toBeChecked();
    expect(await sportsAreValid(page)).toBe(false);
  });

  test("saves the profile, and coming back shows it", async ({ page }) => {
    await fillAthlete(page);
    await submit(page).click();
    await expect(page).toHaveURL("/");

    await gotoHydrated(page, "/onboarding/athlete");
    await expect(page.getByLabel("First name")).toHaveValue("Jane");
    await expect(page.getByLabel("Last name")).toHaveValue("Doe");
    await expect(page.getByLabel("Nickname")).toHaveValue("JD");
    await expect(page.getByLabel("Year of birth")).toHaveValue("1998");
    await expect(page.getByLabel("City")).toHaveValue("Warsaw");
    await expect(sportsGroup(page).getByLabel("Bouldering / Climbing")).toBeChecked();
    await expect(sportsGroup(page).getByLabel("Parkour / 3run")).toBeChecked();
    await expect(sportsGroup(page).getByLabel("Snowboard")).not.toBeChecked();
  });

  test("turns away anyone under 18, on the server too", async ({ page }) => {
    const tooYoung = String(new Date().getFullYear() - 17);
    await fillAthlete(page, { birthYear: tooYoung });
    await skipBrowserValidation(page);
    await submit(page).click();

    await expect(alert(page)).toHaveText(
      "Enter your year of birth. You must be 18 or older to join."
    );
    await expect(page).toHaveURL("/onboarding/athlete");
    // What the user typed survives the error.
    await expect(page.getByLabel("First name")).toHaveValue("Jane");
    await expect(page.getByLabel("Year of birth")).toHaveValue(tooYoung);
    await expect(sportsGroup(page).getByLabel("Parkour / 3run")).toBeChecked();
  });

  test("accepts athletes turning 18 this year", async ({ page }) => {
    const turning18 = String(new Date().getFullYear() - 18);
    await fillAthlete(page, { birthYear: turning18 });
    await submit(page).click();
    await expect(page).toHaveURL("/");
  });

  test("trims names on the server and rejects blank ones", async ({ page }) => {
    await fillAthlete(page);
    await skipBrowserValidation(page);
    await page.getByLabel("Nickname").fill("   ");
    await submit(page).click();
    await expect(alert(page)).toHaveText("Enter a nickname (up to 50 characters).");

    await page.getByLabel("Nickname").fill("  JD  ");
    await submit(page).click();
    await expect(page).toHaveURL("/");
    await gotoHydrated(page, "/onboarding/athlete");
    await expect(page.getByLabel("Nickname")).toHaveValue("JD");
  });
});

test.describe("brand onboarding", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await gotoHydrated(page, "/onboarding/brand");
  });

  test("shows the brand fields", async ({ page }) => {
    await expect(page).toHaveTitle("Set up your brand profile | MHS");
    await expect(page.getByRole("heading", { name: "Tell us about your brand" })).toBeVisible();
    await expect(page.getByLabel("Brand name")).toBeVisible();
    await expectAllSports(page);
  });

  test("stays on the page without a sport", async ({ page }) => {
    await page.getByLabel("Brand name").fill("Move Hard");
    await submit(page).click();
    await expect(page).toHaveURL("/onboarding/brand");
  });

  test("checks the sports on the server too", async ({ page }) => {
    await page.getByLabel("Brand name").fill("Move Hard");
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Choose at least one sport.");
    await expect(page.getByLabel("Brand name")).toHaveValue("Move Hard");
  });

  test("saves the profile, and coming back shows it", async ({ page }) => {
    await page.getByLabel("Brand name").fill("Move Hard");
    await pickSport(page, "Triathlon / Ultra");
    await submit(page).click();
    await expect(page).toHaveURL("/");

    await gotoHydrated(page, "/onboarding/brand");
    await expect(page.getByLabel("Brand name")).toHaveValue("Move Hard");
    await expect(sportsGroup(page).getByLabel("Triathlon / Ultra")).toBeChecked();
  });
});
