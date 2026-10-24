"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/session";
import { saveBrandProfile } from "@/lib/profiles/mutations";
import { type BrandProfileValues, parseBrandProfile } from "@/lib/profiles/validation";
import { createClient } from "@/lib/supabase/server";

export type BrandOnboardingState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: BrandProfileValues };

export async function saveBrandOnboarding(
  _prevState: BrandOnboardingState,
  formData: FormData
): Promise<BrandOnboardingState> {
  const supabase = await createClient();
  // Guests go to sign-in and athletes to their own onboarding, even when posting here directly.
  await requireAccount(supabase, "brand");

  const parsed = parseBrandProfile(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  const result = await saveBrandProfile(supabase, parsed.input);
  if (!result.ok) {
    return {
      status: "error",
      message: "We couldn't save your profile. Try again.",
      values: parsed.values,
    };
  }

  redirect("/");
}
