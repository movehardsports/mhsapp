"use client";

import { useEffect, useId, useRef } from "react";
import { checkableTile } from "@/components/ui/styles";

type TagOption = { id: string; label: string };
type TagGroup = { label: string; options: readonly TagOption[] };

type TagPickerProps = {
  name: string;
  legend: string;
  groups: readonly TagGroup[];
  // When set, at least one tag must be picked; this is the message the browser shows otherwise.
  requiredMessage?: string;
};

// Multi-select tags backed by checkboxes, so the picked ids are submitted as `name`.
// Tags are shown in labelled groups to make a long list quick to scan.
export default function TagPicker({ name, legend, groups, requiredMessage }: TagPickerProps) {
  const id = useId();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  // Checkboxes have no native "at least one" rule, so flag the first one while none are picked.
  const updateValidity = () => {
    if (!requiredMessage) return;
    const checkboxes = fieldsetRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
    if (!checkboxes?.length) return;
    const anyChecked = Array.from(checkboxes).some((checkbox) => checkbox.checked);
    checkboxes[0].setCustomValidity(anyChecked ? "" : requiredMessage);
  };

  useEffect(updateValidity);

  return (
    <fieldset ref={fieldsetRef} onChange={updateValidity} className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-col gap-4">
        {groups.map((group, index) => {
          const labelId = `${id}-group-${index}`;
          return (
            <div key={group.label} role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
              <p id={labelId} className="text-xs uppercase tracking-wide text-foreground/60">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <label
                    key={option.id}
                    className={`${checkableTile} px-2.5 py-1.5 text-xs md:px-3 md:text-sm`}
                  >
                    <input type="checkbox" name={name} value={option.id} className="sr-only" />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
