import type { Parsed } from "@/lib/types";
import { cleanMultilineText } from "@/lib/validation";

// Used by the form's maxLength and by the parser below. The database checks the same limit
// (supabase/migrations/20261025200624_create_applications.sql).
export const APPLICATION_MESSAGE_MAX = 1000;

// What the athlete typed, to echo back into the form after an error.
export type ApplicationValues = { message: string };

// A checked application, ready to save.
export type ApplicationInput = { message: string };

// Reads and checks the application form.
export function parseApplication(formData: FormData): Parsed<ApplicationValues, ApplicationInput> {
  const values = { message: String(formData.get("message") ?? "") };
  const message = cleanMultilineText(values.message, APPLICATION_MESSAGE_MAX);
  if (!message) {
    return {
      ok: false,
      values,
      message: `Write a short message (up to ${APPLICATION_MESSAGE_MAX} characters).`,
    };
  }
  return { ok: true, values, input: { message } };
}
