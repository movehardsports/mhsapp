import type { ComponentProps } from "react";
import { inputField } from "@/components/ui/styles";

type FieldProps = Omit<ComponentProps<"input">, "className"> & {
  id: string;
  label: string;
  hint?: string;
};

// A labelled text-like input. Extra props (type, required, ref, …) go to the <input>.
export default function Field({
  id,
  label,
  hint,
  "aria-describedby": describedBy,
  ...inputProps
}: FieldProps) {
  // Screen readers read the hint along with the field, not only when browsing past it. Keep
  // any description the caller passes too.
  const hintId = hint ? `${id}-hint` : undefined;
  const descriptionIds = [hintId, describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={inputField}
        aria-describedby={descriptionIds}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-xs text-foreground/70">
          {hint}
        </p>
      )}
    </div>
  );
}
