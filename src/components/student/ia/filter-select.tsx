import { ChevronDown } from "lucide-react";

export type FilterOption = { value: string; label: string };

/** A pill-shaped filter over a list (Figma 3.2, 4.1): its name while nothing is picked, then the choice. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: readonly FilterOption[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="relative inline-flex max-w-60">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="field-sizing-content h-9 max-w-full appearance-none truncate rounded-full border border-border-default bg-background-surface pr-8 pl-3 type-label text-text-primary focus-visible:outline-2 focus-visible:outline-border-selected"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-icon-muted"
        strokeWidth={1.5}
      />
    </label>
  );
}
