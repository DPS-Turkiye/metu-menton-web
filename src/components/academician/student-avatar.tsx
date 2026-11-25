import { initials } from "@/lib/utils";

/** A student's initials in the ODTÜ tint, as on every academician list and card. */
export function StudentAvatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-background-selected text-text-accent ${small ? "size-8 type-label-sm" : "size-10 type-label"}`}
    >
      {initials(name)}
    </span>
  );
}
