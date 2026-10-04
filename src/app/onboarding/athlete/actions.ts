"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/session";
import {
  birthYearRange,
  cleanText,
  MIN_AGE,
  parseBirthYear,
  parseSports,
} from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export type AthleteOnboardingValues = {
  firstName: string;
  lastName: string;
  nickname: string;
  birthYear: string;
  city: string;
  sports: string[];
};

export type AthleteOnboardingState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: AthleteOnboardingValues };

export async function saveAthleteOnboarding(
  _prevState: AthleteOnboardingState,
  formData: FormData
): Promise<AthleteOnboardingState> {
  const supabase = await createClient();
  // Guests go to sign-in and brands to their own onboarding, even when posting here directly.
  await requireAccount(supabase, "athlete");

  const values: AthleteOnboardingValues = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    birthYear: String(formData.get("birthYear") ?? ""),
    city: String(formData.get("city") ?? ""),
    sports: formData.getAll("sports").map(String),
  };
  const fail = (message: string): AthleteOnboardingState => ({ status: "error", message, values });

  // The browser checks most of this too, but a form posted before hydration (or by hand)
  // skips that. The database enforces the same rules once more.
  const firstName = cleanText(values.firstName, 100);
  if (!firstName) return fail("Enter your first name (up to 100 characters).");
  const lastName = cleanText(values.lastName, 100);
  if (!lastName) return fail("Enter your last name (up to 100 characters).");
  const nickname = cleanText(values.nickname, 50);
  if (!nickname) return fail("Enter a nickname (up to 50 characters).");
  const birthYear = parseBirthYear(values.birthYear);
  const { min, max } = birthYearRange();
  if (birthYear === null || birthYear < min || birthYear > max) {
    return fail(`Enter your year of birth. You must be ${MIN_AGE} or older to join.`);
  }
  const city = cleanText(values.city, 100);
  if (!city) return fail("Enter your city (up to 100 characters).");
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");

  const { error } = await supabase.rpc("save_athlete_profile", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_nickname: nickname,
    p_birth_year: birthYear,
    p_city: city,
    p_sports: sports,
  });
  if (error) {
    console.error("Saving the athlete onboarding failed", error.code, error.message);
    return fail("We couldn't save your profile. Try again.");
  }

  redirect("/");
}
