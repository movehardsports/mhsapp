import type { Metadata } from "next";
import BrandOnboardingForm from "@/components/onboarding/BrandOnboardingForm";
import PageTitle from "@/components/ui/PageTitle";
import { requireAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set up your brand profile",
};

export default async function BrandOnboardingPage() {
  const supabase = await createClient();
  const { userId } = await requireAccount(supabase, "brand");

  // Prefill with the saved profile when the brand comes back.
  const { data: brand, error } = await supabase
    .from("brands")
    .select("name, sports")
    .eq("id", userId)
    .maybeSingle();
  // Showing an empty form would let the brand overwrite its saved profile by mistake.
  if (error) throw new Error("Reading the brand profile failed");

  return (
    <>
      <PageTitle>Tell us about your brand</PageTitle>
      <BrandOnboardingForm saved={{ brandName: brand?.name ?? "", sports: brand?.sports ?? [] }} />
    </>
  );
}
