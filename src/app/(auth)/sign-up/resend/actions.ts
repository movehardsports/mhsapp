"use server";

import { isEmailLike } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
import { formDataOf } from "@/lib/validation";

export type ResendState =
  | { status: "idle" }
  // Echo back the email so the form keeps it after an error.
  | { status: "error"; message: string; email: string }
  | { status: "sent"; email: string };

export async function resendConfirmation(
  _prevState: ResendState,
  payload: unknown
): Promise<ResendState> {
  const formData = formDataOf(payload);
  const email = String(formData.get("email") ?? "").trim();
  const fail = (message: string): ResendState => ({ status: "error", message, email });

  // The browser checks this too, but a form posted before hydration (or by hand) skips that.
  if (!isEmailLike(email)) return fail("Enter a valid email address.");

  const supabase = await createClient();
  // Sends the same confirmation email as sign-up (supabase/templates/confirmation.html), with a
  // new link; the old one stops working.
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    switch (error.code) {
      // Auth allows one email per address per minute (less locally). Only an unconfirmed
      // account reaches this, but it reveals no more than "wait".
      case "over_email_send_rate_limit":
      case "over_request_rate_limit":
        return fail("Wait a minute, then ask for another link.");
      case "email_address_invalid":
      case "validation_failed":
        console.error("Resending the confirmation failed", error.code, error.message);
        return fail("Enter a valid email address.");
      default:
        console.error("Resending the confirmation failed", error.code, error.message);
        return fail("We couldn't send a new link. Try again.");
    }
  }

  // Auth answers the same way for an unconfirmed account (which gets a new link), a confirmed
  // one and an unknown email, so this doesn't reveal which emails have accounts.
  return { status: "sent", email };
}
