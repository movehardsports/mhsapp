import { primaryButton } from "@/components/ui/styles";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={`${primaryButton} mt-2 px-4 py-2.5 text-sm uppercase tracking-wide`}
    >
      {children}
    </button>
  );
}
