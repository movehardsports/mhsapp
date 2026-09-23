import type { Metadata } from "next";
import BrandOnboardingForm from "@/components/onboarding/BrandOnboardingForm";
import PageTitle from "@/components/ui/PageTitle";

export const metadata: Metadata = {
  title: "Set up your brand profile",
};

export default function BrandOnboardingPage() {
  return (
    <>
      <PageTitle>Tell us about your brand</PageTitle>
      <BrandOnboardingForm />
    </>
  );
}
