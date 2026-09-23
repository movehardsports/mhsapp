import type { ComponentProps } from "react";

type FieldProps = Omit<ComponentProps<"input">, "className"> & {
  id: string;
  label: string;
  hint?: string;
};

// A labelled text-like input. Extra props (type, required, ref, …) go to the <input>.
export default function Field({ id, label, hint, ...inputProps }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="w-full rounded-button border border-foreground/20 bg-transparent px-3 py-2 outline-none transition-colors focus:border-foreground"
        {...inputProps}
      />
      {hint && <p className="text-xs text-foreground/70">{hint}</p>}
    </div>
  );
}
