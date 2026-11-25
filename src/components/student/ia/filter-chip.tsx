import { Check } from "lucide-react";
import type { ReactNode } from "react";

/** A filter that is on or off (Figma 3.2 "Müsait saati olanlar", 4.1's categories). */
export function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 type-label focus-visible:outline-2 focus-visible:outline-border-selected ${
        pressed
          ? "border-action-accent bg-background-selected text-text-accent"
          : "border-border-default bg-background-surface text-text-primary hover:bg-background-subtle"
      }`}
    >
      {pressed ? (
        <Check aria-hidden className="size-4" strokeWidth={1.5} />
      ) : null}
      {children}
    </button>
  );
}
