"use client";

import { useActionState } from "react";
import {
  type BrandOnboardingState,
  type BrandOnboardingValues,
  saveBrandOnboarding,
} from "@/app/onboarding/brand/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import TagPicker from "@/components/forms/TagPicker";
import { formError } from "@/components/ui/styles";
import { sportGroups } from "@/lib/sports";

const initialState: BrandOnboardingState = { status: "idle" };

// `saved` is the saved profile when the brand comes back, otherwise empty values.
export default function BrandOnboardingForm({ saved }: { saved: BrandOnboardingValues }) {
  const [state, formAction] = useActionState(saveBrandOnboarding, initialState);
  const values = state.status === "error" ? state.values : saved;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        id="brandName"
        label="Brand name"
        required
        maxLength={100}
        autoComplete="organization"
        defaultValue={values.brandName}
      />
      <TagPicker
        name="sports"
        legend="Sports"
        groups={sportGroups}
        requiredMessage="Choose at least one sport."
        defaultValues={values.sports}
      />

      {state.status === "error" && (
        <p role="alert" className={formError}>
          {state.message}
        </p>
      )}

      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}
