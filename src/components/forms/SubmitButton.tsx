"use client";

import { useFormStatus } from "react-dom";
import { primaryButton } from "@/components/ui/styles";

// Disabled while its form's action runs, so a double click doesn't submit twice.
export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${primaryButton} mt-2 px-4 py-2.5 text-sm tracking-wide uppercase disabled:cursor-wait disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
