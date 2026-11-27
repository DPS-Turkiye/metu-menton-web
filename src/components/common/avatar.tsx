import { useTranslations } from "next-intl";

import { PersonPhotoAvatar } from "@/components/common/person-photo-avatar";

/**
 * A person's photo when they have one, otherwise their initials; `className` sets size and text. `photoUrl` is a
 * photo known to exist (your own); `personId` asks for someone's, keeping the initials when there is none to show.
 */
export function PhotoAvatar({
  initials,
  photoUrl = null,
  personId = null,
  className,
  label,
  decorative = false,
  colors = "bg-[#fbe2d0] text-[#c95c18]",
}: {
  initials: string;
  photoUrl?: string | null;
  personId?: string | null | undefined;
  className: string;
  label?: string;
  /** Beside a visible or labelled name, the photo adds nothing to announce. */
  decorative?: boolean;
  /** Background and initials colour; the default is the mentee orange. */
  colors?: string;
}) {
  const t = useTranslations("sharedUi");
  if (photoUrl) {
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : (label ?? t("profilePhoto"))}
        aria-hidden={decorative || undefined}
        className={`block shrink-0 rounded-full bg-cover bg-center ${colors} ${className}`}
        style={{ backgroundImage: `url("${photoUrl}")` }}
      />
    );
  }
  if (personId) {
    return (
      <PersonPhotoAvatar
        personId={personId}
        initials={initials}
        label={label}
        decorative={decorative}
        className={`rounded-full font-semibold ${colors} ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${colors} ${className}`}
    >
      {initials}
    </span>
  );
}

export function Avatar({
  initials,
  tone = "gray",
  size = "md",
  personId = null,
}: {
  initials: string;
  tone?: "gray" | "purple" | "teal" | "orange" | "blue";
  size?: "sm" | "md" | "lg";
  /** Shows the person's photo over the initials when there is one to show. */
  personId?: string | null | undefined;
}) {
  const tones = {
    gray: "bg-[#eeeeee] text-[#555]",
    purple: "bg-[#f3e8ff] text-[#8200db]",
    teal: "bg-[#cbfbf1] text-[#00786f]",
    orange: "bg-[#fdebdd] text-[#c85816]",
    blue: "bg-[#e6f1f8] text-[#1a8ad9]",
  };
  const sizes = {
    sm: "size-7 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
  };
  if (personId) {
    return (
      <PersonPhotoAvatar
        personId={personId}
        initials={initials}
        decorative
        className={`rounded-full font-semibold ${tones[tone]} ${sizes[size]}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tones[tone]} ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
