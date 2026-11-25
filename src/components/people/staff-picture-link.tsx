"use client";

import type { ReactNode } from "react";

import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import { usePersonProfileHref } from "@/hooks/use-person-profile-href";

/** The picture of a mentor or mentee on an admin or coordinator screen: opens their page in the same frame. */
export function StaffPictureLink({
  userId,
  name,
  children,
}: {
  userId: string | null;
  name: string;
  children: ReactNode;
}) {
  const profileHref = usePersonProfileHref();
  return (
    <ProfilePictureLink href={userId ? profileHref(userId) : null} name={name}>
      {children}
    </ProfilePictureLink>
  );
}
