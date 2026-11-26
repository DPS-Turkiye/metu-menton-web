"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyProgramFeatures } from "@/lib/client/program-features";
import {
  ALL_STUDENT_FEATURES,
  studentFeatureView,
} from "@/lib/program-features";
import { showsStudentHref } from "@/lib/student-features";

export const MY_PROGRAM_FEATURES_QUERY_KEY = [
  "me",
  "program-features",
] as const;

/**
 * What the student's semester runs, for the menu and the home page's shortcuts. Until it loads, or when it cannot be
 * read, nothing is hidden: the pages themselves still work, so a slow answer must not take a menu item away.
 */
export function useStudentFeatures() {
  const query = useQuery({
    queryKey: MY_PROGRAM_FEATURES_QUERY_KEY,
    queryFn: getMyProgramFeatures,
  });
  const view = query.data
    ? studentFeatureView(query.data)
    : ALL_STUDENT_FEATURES;
  return {
    view,
    /** Whether a student page or shortcut is shown; pages outside the features always are. */
    shows: (href: string) => showsStudentHref(href, view),
    /** The menu items or shortcuts whose pages the student is shown. */
    visible: <T extends { href: string }>(items: readonly T[]) =>
      items.filter((item) => showsStudentHref(item.href, view)),
  };
}
