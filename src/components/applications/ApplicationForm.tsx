"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ApplicationFormState } from "@/app/campaigns/[id]/actions";
import SubmitButton from "@/components/forms/SubmitButton";
import { formError, inputField } from "@/components/ui/styles";
import { APPLICATION_MESSAGE_MAX } from "@/lib/applications/validation";

const initialState: ApplicationFormState = { status: "idle" };

type Props = {
  // applyToCampaign, bound to the campaign's id.
  action: (state: ApplicationFormState, payload: unknown) => Promise<ApplicationFormState>;
};

export default function ApplicationForm({ action }: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const previous = state.status === "error" ? state : null;
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // After an error, back to the message, which the error now describes: the submit button lost
  // focus while it was disabled.
  useEffect(() => {
    if (state.status === "error") messageRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-sm font-medium">
          Message to the brand
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={APPLICATION_MESSAGE_MAX}
          rows={5}
          ref={messageRef}
          aria-describedby={previous ? "message-error message-hint" : "message-hint"}
          aria-invalid={previous ? true : undefined}
          defaultValue={previous?.values.message}
          className={inputField}
        />
        <p id="message-hint" className="text-xs text-foreground/70">
          Why you&apos;re a good fit. The brand also sees your public profile.
        </p>
      </div>

      {previous && (
        <p id="message-error" role="alert" className={formError}>
          {previous.message}
        </p>
      )}

      <SubmitButton pendingLabel="Applying…">Apply</SubmitButton>
    </form>
  );
}
