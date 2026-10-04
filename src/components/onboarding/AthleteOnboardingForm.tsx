"use client";

import { useActionState } from "react";
import {
  type AthleteOnboardingState,
  type AthleteOnboardingValues,
  saveAthleteOnboarding,
} from "@/app/onboarding/athlete/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import TagPicker from "@/components/forms/TagPicker";
import { formError } from "@/components/ui/styles";
import { sportGroups } from "@/lib/sports";

const initialState: AthleteOnboardingState = { status: "idle" };

type Props = {
  // The saved profile when the athlete comes back, otherwise empty strings.
  saved: AthleteOnboardingValues;
  birthYears: { min: number; max: number };
};

export default function AthleteOnboardingForm({ saved, birthYears }: Props) {
  const [state, formAction] = useActionState(saveAthleteOnboarding, initialState);
  const values = state.status === "error" ? state.values : saved;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="firstName"
          label="First name"
          required
          maxLength={100}
          autoComplete="given-name"
          defaultValue={values.firstName}
        />
        <Field
          id="lastName"
          label="Last name"
          hint="Only you can see it."
          required
          maxLength={100}
          autoComplete="family-name"
          defaultValue={values.lastName}
        />
      </div>
      <Field
        id="nickname"
        label="Nickname"
        required
        maxLength={50}
        autoComplete="nickname"
        defaultValue={values.nickname}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="birthYear"
          label="Year of birth"
          hint="You must be 18 or older."
          type="number"
          required
          min={birthYears.min}
          max={birthYears.max}
          step={1}
          inputMode="numeric"
          autoComplete="bday-year"
          defaultValue={values.birthYear}
        />
        <Field
          id="city"
          label="City"
          required
          maxLength={100}
          autoComplete="address-level2"
          defaultValue={values.city}
        />
      </div>
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
