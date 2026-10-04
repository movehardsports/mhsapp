"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState =
  | { status: "idle" }
  // Echo back the email (never the password) so the form keeps it after an error.
  | { status: "error"; message: string; email: string };

export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fail = (message: string): SignInState => ({ status: "error", message, email });

  // The browser checks these too, but a form posted before hydration (or by hand) skips that.
  if (!email || !password) return fail("Enter your email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    switch (error.code) {
      // One message for an unknown email and a wrong password, so the form doesn't reveal
      // which emails have accounts.
      case "invalid_credentials":
        return fail("Wrong email or password.");
      // Supabase only reports this after the password matched.
      case "email_not_confirmed":
        return fail("Confirm your email first: open the link we sent when you signed up.");
      case "over_request_rate_limit":
        return fail("Too many attempts. Wait a few minutes and try again.");
      default:
        console.error("Sign-in failed", error.code, error.message);
        return fail("We couldn't sign you in. Try again.");
    }
  }

  // The header shows the signed-in state on every page, so refresh the whole layout.
  revalidatePath("/", "layout");
  redirect("/");
}
