"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import TagPicker from "@/components/forms/TagPicker";
import { sportGroups } from "@/lib/sports";

export default function AthleteOnboardingForm() {
  const router = useRouter();

  // UI only for now: nothing is saved. Wire this up to the athlete profile once there's a backend.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="firstName" label="First name" required autoComplete="given-name" />
        <Field id="lastName" label="Last name" required autoComplete="family-name" />
      </div>
      <Field id="nickname" label="Nickname" required autoComplete="nickname" />
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="age" label="Age" type="number" required min={1} max={120} inputMode="numeric" />
        <Field id="city" label="City" required autoComplete="address-level2" />
      </div>
      <TagPicker name="sports" legend="Sports" groups={sportGroups} requiredMessage="Choose at least one sport." />
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}
