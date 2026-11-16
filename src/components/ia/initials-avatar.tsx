import { initials } from "@/lib/utils";

/** The 24 px initials avatar of a table row. */
export function InitialsAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-background-selected type-caption text-text-accent"
    >
      {initials(name)}
    </span>
  );
}
