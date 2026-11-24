/** The Figma "Toggle": an immediate on/off setting with its label beside it (44 × 24 track, no save button). */
export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-lg text-left type-body text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-action-accent" : "bg-border-control"
        }`}
      >
        <span
          className={`size-5 rounded-full bg-background-surface shadow-raised transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
      {label}
    </button>
  );
}
