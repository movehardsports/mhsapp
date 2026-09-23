import type { Metadata } from "next";
import BrandOnboardingForm from "@/components/onboarding/BrandOnboardingForm";

export const metadata: Metadata = {
  title: "Set up your brand profile",
};

export default function BrandOnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-xl">
      <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">Tell us about your brand</h1>
      <BrandOnboardingForm />
    </main>
  );
}
