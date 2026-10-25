"use server";

import { type AccountType, isAccountType } from "@/lib/accountTypes";
import { isEmailLike, passwordProblem } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
import { formDataOf } from "@/lib/validation";

export type SignUpState =
  | { status: "idle" }
  // Echo back what the user typed (never the password) so the form keeps it after an error.
  | { status: "error"; message: string; email: string; accountType: AccountType | null }
  | { status: "check-email"; email: string };

export async function signUp(_prevState: SignUpState, payload: unknown): Promise<SignUpState> {
  const formData = formDataOf(payload);
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
  if (!isEmailLike(email)) return fail("Enter a valid email address.");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
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
      // Auth's own email checks (format, length) answer validation_failed; the password and
      // account type are checked above, so it's the email.
      case "email_address_invalid":
      case "validation_failed":
        return fail("Enter a valid email address.");
      // Auth only says this when phone or email autoconfirm is on (see [auth.sms] in
      // supabase/config.toml). Answer like any other sign-up, so the form never reveals
      // which emails have accounts.
      case "user_already_exists":
      case "email_exists":
        return { status: "check-email", email };
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return fail("Too many attempts. Wait a few minutes and try again.");
      default:
        console.error("Sign-up failed", error.code, error.message);
        return fail("We couldn't create your account. Try again.");
    }
  }

  // With email confirmation on, Auth answers the same way whether or not the email is already
  // registered (it sends a new link only for new or unconfirmed accounts), so this message
  // doesn't reveal which emails have accounts. The page says what to do if you already have one.
  return { status: "check-email", email };
}
