"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/session";
import { cleanText, parseSports } from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export type BrandOnboardingValues = {
  brandName: string;
  sports: string[];
};

export type BrandOnboardingState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: BrandOnboardingValues };

export async function saveBrandOnboarding(
  _prevState: BrandOnboardingState,
  formData: FormData
): Promise<BrandOnboardingState> {
  const supabase = await createClient();
  // Guests go to sign-in and athletes to their own onboarding, even when posting here directly.
  await requireAccount(supabase, "brand");

  const values: BrandOnboardingValues = {
    brandName: String(formData.get("brandName") ?? ""),
    sports: formData.getAll("sports").map(String),
  };
  const fail = (message: string): BrandOnboardingState => ({ status: "error", message, values });

  // The browser checks this too, but a form posted before hydration (or by hand) skips that.
  // The database enforces the same rules once more.
  const name = cleanText(values.brandName, 100);
  if (!name) return fail("Enter your brand name (up to 100 characters).");
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");

  const { error } = await supabase.rpc("save_brand_profile", { p_name: name, p_sports: sports });
  if (error) {
    console.error("Saving the brand onboarding failed", error.code, error.message);
    return fail("We couldn't save your profile. Try again.");
  }

  redirect("/");
}
