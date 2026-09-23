"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";

export default function BrandOnboardingForm() {
  const router = useRouter();

  // UI only for now: nothing is saved. Wire this up to the brand profile once there's a backend.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="brandName" label="Brand name" required autoComplete="organization" />
      <Field id="sport" label="Sport" required />
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}
