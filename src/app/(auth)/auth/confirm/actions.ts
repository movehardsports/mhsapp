"use server";

import { redirect } from "next/navigation";
import { isAccountType, onboardingPath } from "@/lib/accountTypes";
import { createClient } from "@/lib/supabase/server";

const confirmErrorPath = "/sign-up/confirm-error";

// Verifying the token hash confirms the email and signs the user in on this device, whichever
// browser they signed up in.
export async function confirmEmail(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  if (typeof tokenHash !== "string" || tokenHash === "") redirect(confirmErrorPath);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) redirect(confirmErrorPath);

  // Continue to the onboarding for the account type stored in the profile. The redirect target
  // never comes from the request, so the link can't be turned into an open redirect.
  const { data: profile } = await supabase.from("profiles").select("account_type").single();
  if (!isAccountType(profile?.account_type)) redirect("/");

  redirect(onboardingPath(profile.account_type));
}
