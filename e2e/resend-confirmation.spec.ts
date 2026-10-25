import { expect, type Page, test } from "@playwright/test";
import { signUp, TEST_PASSWORD } from "./auth";
import { gotoHydrated } from "./hydration";
import { confirmationLinkPath, uniqueEmail } from "./mailpit";

const main = (page: Page) => page.getByRole("main");

async function requestNewLink(page: Page, email: string) {
  await gotoHydrated(page, "/sign-up/resend");
  await page.getByLabel("Email").fill(email);
  await main(page).getByRole("button", { name: "Send a new link" }).click();
}

const sentText = "we sent it a new confirmation link";

test("an unconfirmed account gets a new link, and only the newest one works", async ({
  page,
}, testInfo) => {
  const email = await signUp(page, testInfo, { confirm: false });
  const firstLink = await confirmationLinkPath(email);

  // Auth sends at most one email per address per max_frequency (supabase/config.toml); asking
  // sooner answers the same but sends nothing, so ask until a new email arrives.
  let newLink = firstLink;
  await expect(async () => {
    await requestNewLink(page, email);
    await expect(page.getByRole("status")).toContainText(sentText);
    newLink = await confirmationLinkPath(email);
    expect(newLink).not.toBe(firstLink);
  }).toPass();
  // No form data ends up in the URL.
  await expect(page).toHaveURL("/sign-up/resend");

  await page.goto(firstLink);
  await main(page).getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL("/sign-up/confirm-error");

  await page.goto(newLink);
  await main(page).getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL("/onboarding/athlete");
});

test("every email gets the same answer, even when asked twice", async ({ page }, testInfo) => {
  // Asking twice in a row hits Auth's per-email rate limit, but only for unconfirmed accounts,
  // so that must not change the answer either.
  const unconfirmed = await signUp(page, testInfo, { confirm: false });
  const confirmed = await signUp(page, testInfo);
  await page.context().clearCookies();

  for (const email of [unconfirmed, confirmed, uniqueEmail(testInfo)]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      await requestNewLink(page, email);
      await expect(page.getByRole("status"), email).toContainText(email);
      await expect(page.getByRole("status"), email).toContainText(sentText);
    }
  }
});

test("the pages that mention a lost link lead here", async ({ page }, testInfo) => {
  const resend = (where: ReturnType<typeof main>) =>
    where.getByRole("link", { name: /new (confirmation )?link/ });

  // An invalid confirmation link.
  await page.goto("/sign-up/confirm-error");
  await expect(resend(main(page))).toHaveAttribute("href", "/sign-up/resend");

  // Right after signing up.
  const email = await signUp(page, testInfo, { confirm: false });
  await expect(resend(main(page))).toHaveAttribute("href", "/sign-up/resend");

  // Signing in before confirming.
  await gotoHydrated(page, "/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await main(page).getByRole("button", { name: "Sign in" }).click();
  await expect(main(page).getByRole("alert")).toContainText("Confirm your email first");
  await resend(main(page)).click();
  await expect(page).toHaveURL("/sign-up/resend");
});

test("signed-in users skip this page", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await page.goto("/sign-up/resend");
  await expect(page).toHaveURL("/onboarding/athlete");
});
