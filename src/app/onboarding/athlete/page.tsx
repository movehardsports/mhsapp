import type { Metadata } from "next";
import AthleteOnboardingForm from "@/components/onboarding/AthleteOnboardingForm";
import PageTitle from "@/components/ui/PageTitle";
import { requireAccount } from "@/lib/auth/session";
import { getOwnAthleteProfile } from "@/lib/profiles/queries";
import { birthYearRange } from "@/lib/profiles/validation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set up your athlete profile",
};

export default async function AthleteOnboardingPage() {
  const supabase = await createClient();
  const { userId } = await requireAccount(supabase, "athlete");

  // Prefill with the saved profile when the athlete comes back.
  const { athlete, lastName } = await getOwnAthleteProfile(supabase, userId);

  return (
    <>
      <PageTitle>Onboarding</PageTitle>
      <AthleteOnboardingForm
        saved={{
          firstName: athlete?.first_name ?? "",
          lastName: lastName ?? "",
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
