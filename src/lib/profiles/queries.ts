import "server-only";
import type { Supabase } from "@/lib/supabase/server";

// Reads of athlete and brand profiles. Each throws when the database can't be read: showing an
// empty onboarding form instead would let the user overwrite their saved profile by mistake.

// The athlete's own profile, for their onboarding form. Either part can be missing: the public
// profile (null until onboarding is saved) and the private last name, which lives in its own
// table and is readable only by its owner.
export async function getOwnAthleteProfile(supabase: Supabase, userId: string) {
  const [athlete, details] = await Promise.all([
    supabase
      .from("athletes")
      .select("first_name, nickname, birth_year, city, sports")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("athlete_private").select("last_name").eq("id", userId).maybeSingle(),
  ]);
  if (athlete.error || details.error) throw new Error("Reading the athlete profile failed");
  return { athlete: athlete.data, lastName: details.data?.last_name ?? null };
}

// The brand's profile, or null until its onboarding is saved.
export async function getBrandProfile(supabase: Supabase, userId: string) {
  const { data, error } = await supabase
    .from("brands")
    .select("name, sports")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Reading the brand profile failed");
  return data;
}
