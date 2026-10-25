"use client";

import { requestSectionFocus } from "@/components/applications/SectionHeading";
import SubmitButton from "@/components/forms/SubmitButton";

// The Withdraw button: a form, so it works before hydration too.
export default function WithdrawApplication({
  action,
  closed,
}: {
  // withdrawApplication, bound to the campaign's id.
  action: () => Promise<void>;
  closed: boolean;
}) {
  return (
    <form action={action} onSubmit={requestSectionFocus} className="mt-4">
      {closed && (
        <p className="mb-2 text-sm text-foreground/70">
          Applications are closed, so you can&apos;t apply again once you withdraw.
        </p>
      )}
      <SubmitButton
        pendingLabel="Withdrawing…"
        className="cursor-pointer text-sm font-medium text-red-600 underline-offset-4 hover:underline dark:text-red-400"
      >
        Withdraw application
      </SubmitButton>
    </form>
  );
}
