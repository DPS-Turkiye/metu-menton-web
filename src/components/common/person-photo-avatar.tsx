"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { useImageFallback } from "@/hooks/use-image-fallback";
import { personPhotoPath } from "@/lib/client/person-photo";

/**
 * Someone's avatar when it is not known whether they have a photo, or whether this viewer may see it: the initials
 * show until the photo has loaded, and stay when there is none. `className` carries the shape, size, colours
 * and text.
 */
export function PersonPhotoAvatar({
  personId,
  initials,
  className,
  label,
  decorative = false,
}: {
  personId: string;
  initials: string;
  className: string;
  label?: string | undefined;
  /** Beside a visible or labelled name, the photo adds nothing to announce. */
  decorative?: boolean | undefined;
}) {
  const t = useTranslations("sharedUi");
  const photo = useImageFallback(personPhotoPath(personId));
  const announced = photo.shown && !decorative;
  return (
    <span
      role={announced ? "img" : undefined}
      aria-label={announced ? (label ?? t("profilePhoto")) : undefined}
      aria-hidden={announced ? undefined : true}
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
    >
      <span className={photo.shown ? "invisible" : undefined}>{initials}</span>
      {photo.src ? (
        // Same-origin and per viewer: the optimizer could not fetch it with the viewer's session.
        <Image
          src={photo.src}
          alt=""
          fill
          unoptimized
          sizes="64px"
          draggable={false}
          onLoad={photo.onLoad}
          onError={photo.onError}
          className={`object-cover ${photo.shown ? "" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
