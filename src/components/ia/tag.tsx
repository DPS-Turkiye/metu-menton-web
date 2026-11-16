import type { ReactNode } from "react";

import {
  STATUS_TONE_CLASSES,
  type StatusTone,
} from "@/components/ia/status-badge";

/** The Figma "Tag": a 32 px label for a category or a badge, in a status tone. */
export function Tag({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-8 w-fit items-center rounded-full pr-2 pl-3 whitespace-nowrap type-label-sm ${STATUS_TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
