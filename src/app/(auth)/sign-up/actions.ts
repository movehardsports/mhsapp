"use server";

import { type AccountType, isAccountType } from "@/lib/accountTypes";
import { createClient } from "@/lib/supabase/server";

export type SignUpState =
  | { status: "idle" }
  // Echo back what the user typed (never the password) so the form keeps it after an error.
  | { status: "error"; message: string; email: string; accountType: AccountType | null }
  | { status: "check-email"; email: string };

// Supabase hashes passwords with bcrypt, which only uses the first 72 bytes.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

export async function signUp(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const accountType = formData.get("accountType");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fail = (message: string): SignUpState => ({
    status: "error",
    message,
    email,
    accountType: isAccountType(accountType) ? accountType : null,
  });

  // The browser checks all of this too, but a form posted before hydration (or by hand)
  // skips those checks.
  if (!isAccountType(accountType)) return fail("Choose an account type.");
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return fail("Your password is too long.");
  }
  if (password !== confirmPassword) return fail("Passwords don't match.");

  const supabase = await createClient();
  // The database trigger creates the profile from account_type and rejects sign-ups without
  // a valid one (see supabase/migrations). Never read the account type back from user metadata:
  // users can edit it.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { account_type: accountType } },
  });

  if (error) {
    switch (error.code) {
      case "weak_password":
        return fail("Choose a stronger password.");
      case "email_address_invalid":
        return fail("Enter a valid email address.");
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return fail("Too many attempts. Wait a few minutes and try again.");
      default:
        console.error("Sign-up failed", error.code, error.message);
        return fail("We couldn't create your account. Try again.");
    }
  }

  // With email confirmation on, Supabase answers the same way whether or not the email is
  // already registered, so this message doesn't reveal which emails have accounts.
  return { status: "check-email", email };
}
