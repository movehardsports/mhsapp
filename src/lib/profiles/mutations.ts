import "server-only";
import type { AthleteProfileInput, BrandProfileInput } from "@/lib/profiles/validation";
import type { Supabase } from "@/lib/supabase/server";

// Saves the signed-in user's own profile (the database functions use auth.uid()). They log
// database errors and return a result for the Server Action to turn into a message.

// Saves the public profile and the private last name in one transaction.
export async function saveAthleteProfile(
  supabase: Supabase,
  profile: AthleteProfileInput
): Promise<{ ok: boolean }> {
  const { error } = await supabase.rpc("save_athlete_profile", {
    p_first_name: profile.firstName,
    p_last_name: profile.lastName,
    p_nickname: profile.nickname,
    p_birth_year: profile.birthYear,
    p_city: profile.city,
    p_sports: profile.sports,
  });
  if (error) console.error("Saving the athlete onboarding failed", error.code, error.message);
  return { ok: !error };
}

export async function saveBrandProfile(
  supabase: Supabase,
  profile: BrandProfileInput
): Promise<{ ok: boolean }> {
  const { error } = await supabase.rpc("save_brand_profile", {
    p_name: profile.name,
    p_sports: profile.sports,
  });
  if (error) console.error("Saving the brand onboarding failed", error.code, error.message);
  return { ok: !error };
}
