"use client";

import { useFormStatus } from "react-dom";
import { primaryButton } from "@/components/ui/styles";

// Disabled while its form's action runs, so a double click doesn't submit twice. `className`
// replaces the default primary button look, e.g. for a text-style button.
export default function SubmitButton({
  children,
  className = `${primaryButton} mt-2 px-4 py-2.5 text-sm tracking-wide uppercase`,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
