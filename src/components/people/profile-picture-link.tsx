import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

/** A person's picture as the way to their profile; just the picture when there is no profile for the viewer. */
export function ProfilePictureLink({
  href,
  name,
  children,
}: {
  href: string | null;
  name: string;
  children: ReactNode;
}) {
  const t = useTranslations("personSummary");
  if (!href) return children;
  return (
    <Link
      href={href}
      aria-label={t("pictureFor", { name })}
      className="relative shrink-0 rounded-full transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected"
    >
      {children}
    </Link>
  );
}
