import type { Metadata } from "next";
import AthleteOnboardingForm from "@/components/onboarding/AthleteOnboardingForm";
import PageTitle from "@/components/ui/PageTitle";
import { requireAccount } from "@/lib/auth/session";
import { birthYearRange } from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set up your athlete profile",
};

export default async function AthleteOnboardingPage() {
  const supabase = await createClient();
  const { userId } = await requireAccount(supabase, "athlete");

  // Prefill with the saved profile when the athlete comes back. Either row can be missing.
  const [athleteResult, detailsResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("first_name, nickname, birth_year, city, sports")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("athlete_private").select("last_name").eq("id", userId).maybeSingle(),
  ]);
  // Showing an empty form would let the athlete overwrite their saved profile by mistake.
  if (athleteResult.error || detailsResult.error)
    throw new Error("Reading the athlete profile failed");
  const athlete = athleteResult.data;
  const details = detailsResult.data;

  return (
    <>
      <PageTitle>Onboarding</PageTitle>
      <AthleteOnboardingForm
        saved={{
          firstName: athlete?.first_name ?? "",
          lastName: details?.last_name ?? "",
          nickname: athlete?.nickname ?? "",
          birthYear: athlete ? String(athlete.birth_year) : "",
          city: athlete?.city ?? "",
          sports: athlete?.sports ?? [],
        }}
        birthYears={birthYearRange()}
      />
    </>
  );
}
