import Image from "next/image";
import type { ReactNode } from "react";

import { STATUS_TONE_CLASSES, StatusTone } from "@/components/ia/status-badge";

/** The 8 px dot a "running" status carries instead of a 16 px line icon. */
export const STATUS_DOT_ICON = "/ia/icons/status-dot.svg";

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
  const size = icon === STATUS_DOT_ICON ? 8 : 16;
  return (
    <span
      className={`inline-flex h-7 w-fit items-center gap-1 rounded-full pr-3 pl-2.5 whitespace-nowrap type-label-sm ${STATUS_TONE_CLASSES[tone]}`}
    >
      <Image alt="" src={icon} width={size} height={size} />
      {children}
    </span>
  );
}

export { StatusTone };
