"use client";

import { useActionState, useRef } from "react";
import { type SignUpState, signUp } from "@/app/(auth)/sign-up/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import { checkableTile, formError } from "@/components/ui/styles";
import { accountTypeLabels, accountTypes } from "@/lib/accountTypes";

const initialState: SignUpState = { status: "idle" };

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, initialState);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // Use the browser's own validation UI for the mismatch, like the other fields.
  const checkPasswordsMatch = () => {
    const confirm = confirmRef.current;
    if (!confirm) return;
    const mismatch = confirm.value !== "" && confirm.value !== passwordRef.current?.value;
    confirm.setCustomValidity(mismatch ? "Passwords don't match" : "");
  };

  if (state.status === "check-email") {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-foreground/70">
          We sent a confirmation link to <strong className="text-foreground">{state.email}</strong>.
          Open it to finish signing up.
        </p>
      </div>
    );
  }

  const previous = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Account type</legend>
        <div className="grid grid-cols-2 gap-3">
          {accountTypes.map((type) => (
            <label key={type} className={`${checkableTile} justify-center px-4 py-3 text-sm`}>
              <input
                type="radio"
                name="accountType"
                value={type}
                required
                defaultChecked={previous?.accountType === type}
                className="sr-only"
              />
              {accountTypeLabels[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        defaultValue={previous?.email}
      />
      <Field
        ref={passwordRef}
        id="password"
        label="Password"
        hint="At least 8 characters."
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        onInput={checkPasswordsMatch}
      />
      <Field
        ref={confirmRef}
        id="confirmPassword"
        label="Confirm password"
        type="password"
        required
        autoComplete="new-password"
        onInput={checkPasswordsMatch}
      />

      {previous && (
        <p role="alert" className={formError}>
          {previous.message}
        </p>
      )}

      <SubmitButton>Sign up</SubmitButton>
    </form>
  );
}
