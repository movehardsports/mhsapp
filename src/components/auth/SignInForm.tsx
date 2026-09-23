"use client";

import type { FormEvent } from "react";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";

export default function SignInForm() {
  // UI only for now: keep the default GET submit from putting the password in the URL.
  // Wire this up to real sign-in once auth exists.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="email" label="Email" type="email" required autoComplete="email" />
      <Field id="password" label="Password" type="password" required autoComplete="current-password" />
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
