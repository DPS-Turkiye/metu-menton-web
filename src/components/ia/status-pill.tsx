import Image from "next/image";
import type { ReactNode } from "react";

import { STATUS_TONE_CLASSES, StatusTone } from "@/components/ia/status-badge";

/** The Figma "Status Pill": tone, icon and label together, so the status never rests on color alone. */
export function StatusPill({
  tone,
  icon,
  children,
}: {
  tone: StatusTone;
  icon: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-7 w-fit items-center gap-1 rounded-full pr-3 pl-2.5 whitespace-nowrap type-label-sm ${STATUS_TONE_CLASSES[tone]}`}
    >
      <Image alt="" src={icon} width={16} height={16} />
      {children}
    </span>
  );
}

/** The 8 px dot a "running" status carries instead of a line icon. */
export const STATUS_DOT_ICON = "/ia/icons/status-dot.svg";

export { StatusTone };
