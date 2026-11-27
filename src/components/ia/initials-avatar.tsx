import { PersonPhotoAvatar } from "@/components/common/person-photo-avatar";
import { initials } from "@/lib/utils";

/** The initials avatar: 24 px in a table row, 32 px (`large`) in a picker list. */
export function InitialsAvatar({
  name,
  large = false,
  personId = null,
}: {
  name: string;
  large?: boolean | undefined;
  /** Shows the person's photo over the initials when there is one to show. */
  personId?: string | null | undefined;
}) {
  const look = `bg-background-selected text-text-accent ${
    large
      ? "size-8 rounded-2xl type-label-sm"
      : "size-6 rounded-xl type-caption"
  }`;
  if (personId) {
    return (
      <PersonPhotoAvatar
        personId={personId}
        initials={initials(name)}
        decorative
        className={look}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center ${look}`}
    >
      {initials(name)}
    </span>
  );
}
