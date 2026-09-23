"use client";

import { useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import { checkableTile } from "@/components/ui/styles";
import { accountTypeLabels, accountTypes, isAccountType, onboardingPath } from "@/lib/accountTypes";

export default function SignUpForm() {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // Use the browser's own validation UI for the mismatch, like the other fields.
  const checkPasswordsMatch = () => {
    const confirm = confirmRef.current;
    if (!confirm) return;
    const mismatch = confirm.value !== "" && confirm.value !== passwordRef.current?.value;
    confirm.setCustomValidity(mismatch ? "Passwords don't match" : "");
  };

  // UI only for now: nothing is saved, we just continue to the onboarding for the chosen
  // account type. preventDefault also keeps the default GET submit from putting the password
  // in the URL. Wire this up to real sign-up once auth exists.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accountType = new FormData(event.currentTarget).get("accountType");
    // The radios are required, so this only fails if the markup and the list drift apart.
    if (!isAccountType(accountType)) throw new Error(`Unknown account type: ${accountType}`);
    router.push(onboardingPath(accountType));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Account type</legend>
        <div className="grid grid-cols-2 gap-3">
          {accountTypes.map((type) => (
            <label
              key={type}
              className={`${checkableTile} justify-center px-4 py-3 text-sm`}
            >
              <input type="radio" name="accountType" value={type} required className="sr-only" />
              {accountTypeLabels[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="email" label="Email" type="email" required autoComplete="email" />
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

      <SubmitButton>Sign up</SubmitButton>
    </form>
  );
}
