import { initials } from "@/lib/utils";

/** The initials avatar: 24 px in a table row, 32 px (`large`) in a picker list. */
export function InitialsAvatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean | undefined;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center bg-background-selected text-text-accent ${
        large
          ? "size-8 rounded-2xl type-label-sm"
          : "size-6 rounded-xl type-caption"
      }`}
    >
      {initials(name)}
    </span>
  );
}
