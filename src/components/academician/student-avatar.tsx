import { PersonPhotoAvatar } from "@/components/common/person-photo-avatar";
import { initials } from "@/lib/utils";

/** A student's initials in the ODTÜ tint, as on every academician list and card. */
export function StudentAvatar({
  name,
  small = false,
  personId = null,
}: {
  name: string;
  small?: boolean;
  /** Shows the student's photo over the initials when there is one to show. */
  personId?: string | null | undefined;
}) {
  if (personId) {
    return (
      <PersonPhotoAvatar
        personId={personId}
        initials={initials(name)}
        decorative
        className={`rounded-full bg-background-selected text-text-accent ${small ? "size-8 type-label-sm" : "size-10 type-label"}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-background-selected text-text-accent ${small ? "size-8 type-label-sm" : "size-10 type-label"}`}
    >
      {initials(name)}
    </span>
  );
}
