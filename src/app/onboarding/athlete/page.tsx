import type { Metadata } from "next";
import AthleteOnboardingForm from "@/components/onboarding/AthleteOnboardingForm";

export const metadata: Metadata = {
  title: "Set up your athlete profile",
};

export default function AthleteOnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
      <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">Set up your athlete profile</h1>
      <AthleteOnboardingForm />
    </main>
  );
}
