import type { Page } from "@playwright/test";

// Locators and form helpers shared by the page specs.

export const main = (page: Page) => page.getByRole("main");
export const alert = (page: Page) => main(page).getByRole("alert");
export const sportsGroup = (page: Page) => page.getByRole("group", { name: "Sports" });

// Removes the browser's own checks, to test the Server Action's, like a form posted before
// hydration or by hand. The main form comes first (the campaign edit page has a delete form
// below it).
export const skipBrowserValidation = (page: Page) =>
  main(page)
    .locator("form")
    .first()
    .evaluate((form) => form.setAttribute("novalidate", ""));
