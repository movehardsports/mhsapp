"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/session";
import { saveAthleteProfile } from "@/lib/profiles/mutations";
import { type AthleteProfileValues, parseAthleteProfile } from "@/lib/profiles/validation";
import { createClient } from "@/lib/supabase/server";
import { formDataOf } from "@/lib/validation";

export type AthleteOnboardingState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: AthleteProfileValues };

export async function saveAthleteOnboarding(
  _prevState: AthleteOnboardingState,
  payload: unknown
): Promise<AthleteOnboardingState> {
  const formData = formDataOf(payload);
  const supabase = await createClient();
  // Guests go to sign-in and brands to their own onboarding, even when posting here directly.
  await requireAccount(supabase, "athlete");

  const parsed = parseAthleteProfile(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  const result = await saveAthleteProfile(supabase, parsed.input);
  if (!result.ok) {
    return {
      status: "error",
      message: "We couldn't save your profile. Try again.",
      values: parsed.values,
    };
  }

  redirect("/");
}
