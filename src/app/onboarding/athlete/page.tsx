import type { Metadata } from "next";
import AthleteOnboardingForm from "@/components/onboarding/AthleteOnboardingForm";
import PageTitle from "@/components/ui/PageTitle";

export const metadata: Metadata = {
  title: "Set up your athlete profile",
};

export default function AthleteOnboardingPage() {
  return (
    <>
      <PageTitle>Onboarding</PageTitle>
      <AthleteOnboardingForm />
    </>
  );
}
