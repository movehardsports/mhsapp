"use client";

import { useFormStatus } from "react-dom";

// Goes inside a <form action={signOut}>. Disabled while signing out, like SubmitButton.
export default function SignOutButton({ className }: { className: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      Sign out
    </button>
  );
}
