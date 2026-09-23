export default function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="mt-2 rounded-button bg-foreground px-4 py-2.5 text-sm font-medium uppercase tracking-wide text-background transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
}
