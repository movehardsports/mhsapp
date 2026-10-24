// Shared Tailwind class sets for elements that must look the same across the app.

export const primaryButton =
  "rounded-button bg-foreground font-medium text-background transition-opacity hover:opacity-90";

// An outlined button or button-like link, next to or instead of a primary one.
export const secondaryButton =
  "rounded-button border border-foreground/15 transition-colors hover:bg-foreground/5";

// A label wrapping a visually hidden radio or checkbox; it fills in while its input is checked.
export const checkableTile =
  "flex cursor-pointer items-center rounded-button border border-foreground/20 uppercase tracking-wide transition-colors hover:bg-foreground/5 has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground";

// Text inputs and textareas. Focus darkens the border and adds the same outline as checkable
// tiles (browsers treat any focus on a text field as focus-visible, clicks included).
export const inputField =
  "w-full rounded-button border border-foreground/20 bg-transparent px-3 py-2 transition-colors focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const textLink = "font-medium text-foreground underline-offset-4 hover:underline";

// A message about a failed form submission, shown above the submit button.
export const formError = "text-sm text-red-600 dark:text-red-400";
