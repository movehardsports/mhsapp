"use client";

import { useActionState } from "react";
import type { CampaignFormState } from "@/app/dashboard/campaigns/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import TagPicker from "@/components/forms/TagPicker";
import { checkableTile, formError, inputField } from "@/components/ui/styles";
import { campaignTypeLabels, campaignTypes } from "@/lib/campaigns/campaignTypes";
import {
  CAMPAIGN_DESCRIPTION_MAX,
  CAMPAIGN_TITLE_MAX,
  type CampaignValues,
} from "@/lib/campaigns/validation";
import { sportGroups } from "@/lib/sports";

const initialState: CampaignFormState = { status: "idle" };

type Props = {
  action: (state: CampaignFormState, formData: FormData) => Promise<CampaignFormState>;
  initialValues: CampaignValues;
  submitLabel: string;
  // Shown on the submit button while saving, e.g. "Creating…".
  pendingLabel: string;
  // The earliest deadline the date input allows (YYYY-MM-DD, UTC), from the server: today, or
  // a saved deadline that has already passed so it can stay. The action still rejects any other
  // past date.
  minDeadline: string;
};

export default function CampaignForm({
  action,
  initialValues,
  submitLabel,
  pendingLabel,
  minDeadline,
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const values = state.status === "error" ? state.values : initialValues;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {campaignTypes.map((type) => (
            <label key={type} className={`${checkableTile} justify-center px-4 py-3 text-sm`}>
              <input
                type="radio"
                name="type"
                value={type}
                required
                defaultChecked={values.type === type}
                className="sr-only"
              />
              {campaignTypeLabels[type]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        id="title"
        label="Title"
        required
        maxLength={CAMPAIGN_TITLE_MAX}
        defaultValue={values.title}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          maxLength={CAMPAIGN_DESCRIPTION_MAX}
          rows={6}
          defaultValue={values.description}
          className={inputField}
        />
      </div>
      <TagPicker
        name="sports"
        legend="Sports"
        groups={sportGroups}
        requiredMessage="Choose at least one sport."
        defaultValues={values.sports}
      />
      <Field
        id="deadline"
        label="Deadline"
        type="date"
        min={minDeadline}
        hint="Optional. The last day to apply."
        defaultValue={values.deadline}
      />

      {state.status === "error" && (
        <p role="alert" className={formError}>
          {state.message}
        </p>
      )}

      <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
    </form>
  );
}
