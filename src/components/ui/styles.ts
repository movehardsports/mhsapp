// Shared Tailwind class sets for elements that must look the same across the app.

export const primaryButton =
  "rounded-button bg-foreground font-medium text-background transition-opacity hover:opacity-90";

// A label wrapping a visually hidden radio or checkbox; it fills in while its input is checked.
export const checkableTile =
  "flex cursor-pointer items-center rounded-button border border-foreground/20 uppercase tracking-wide transition-colors hover:bg-foreground/5 has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground";

export const textLink = "font-medium text-foreground underline-offset-4 hover:underline";
