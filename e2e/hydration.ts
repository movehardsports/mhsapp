import { expect, type Page } from "@playwright/test";

// `page.goto` resolves on load, which can come before React hydrates the page. Forms need
// their handlers attached first: before that a submit is a native GET, and input events don't
// run custom validation. React tags a hydrated element with `__reactProps$…` keys; wait for
// that on the page's form.
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await expect
    .poll(() =>
      page
        .getByRole("main")
        .locator("form")
        .evaluate((form) => Object.keys(form).some((key) => key.startsWith("__reactProps$"))),
    )
    .toBe(true);
}
