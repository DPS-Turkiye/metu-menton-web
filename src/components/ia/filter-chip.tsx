import Image from "next/image";

const CHIP =
  "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 type-label text-text-primary";

/**
 * A dropdown filter chip ("Durum: Tümü ⌄"). A native select sits over the chip, so the keyboard, screen readers and
 * the phone's own picker all work; the chip only draws the current choice.
 */
export function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <span
      className={`relative ${CHIP} border-border-default bg-background-surface`}
    >
      <span aria-hidden>{current?.label ?? label}</span>
      <Image alt="" src="/ia/icons/chip-chevron.svg" width={16} height={16} />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = options.find(
            (option) => option.value === event.target.value,
          );
          if (next) onChange(next.value);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** An on/off filter chip ("✓ Bu hafta"). */
export function ToggleChip({
  label,
  pressed,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`${CHIP} focus-visible:ring-[3px] focus-visible:ring-border-default focus-visible:outline-none ${
        pressed
          ? "border-border-selected bg-background-selected text-text-accent"
          : "border-border-default bg-background-surface"
      }`}
    >
      {pressed ? (
        <Image alt="" src="/ia/icons/chip-check.svg" width={16} height={16} />
      ) : null}
      {label}
    </button>
  );
}
