"use client";

import { useActionState } from "react";
import { type SignInState, signIn } from "@/app/(auth)/sign-in/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import { formError } from "@/components/ui/styles";

const initialState: SignInState = { status: "idle" };

export default function SignInForm() {
  const [state, formAction] = useActionState(signIn, initialState);
  const previous = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        defaultValue={previous?.email}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
      />

      {previous && (
        <p role="alert" className={formError}>
          {previous.message}
        </p>
      )}

      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
