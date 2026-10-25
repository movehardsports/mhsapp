"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type ResendState, resendConfirmation } from "@/app/(auth)/sign-up/resend/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import { signInLink } from "@/components/header/navigation";
import { formError, textLink } from "@/components/ui/styles";
import { EMAIL_MAX } from "@/lib/auth/validation";

const initialState: ResendState = { status: "idle" };

export default function ResendConfirmationForm() {
  const [state, formAction] = useActionState(resendConfirmation, initialState);

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-foreground/70">
          If <strong className="text-foreground">{state.email}</strong> belongs to an account that
          isn&apos;t confirmed yet, we sent it a new confirmation link. Use the link in the newest
          email: earlier ones stop working. Nothing after a few minutes? Try again.
        </p>
        <p className="text-foreground/70">
          Already confirmed?{" "}
          <Link href={signInLink.href} className={textLink}>
            {signInLink.label}
          </Link>
        </p>
      </div>
    );
  }

  const previous = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        maxLength={EMAIL_MAX}
        defaultValue={previous?.email}
      />

      {previous && (
        <p role="alert" className={formError}>
          {previous.message}
        </p>
      )}

      <SubmitButton pendingLabel="Sending…">Send a new link</SubmitButton>
    </form>
  );
}
