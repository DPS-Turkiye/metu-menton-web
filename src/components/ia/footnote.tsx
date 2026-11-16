import Image from "next/image";
import type { ReactNode } from "react";

/** A muted line under a table or form with a leading info (or lock) icon. */
export function Footnote({
  icon = "/ia/icons/info.svg",
  iconSize = 16,
  children,
}: {
  icon?: string | undefined;
  iconSize?: number | undefined;
  children: ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 type-caption text-text-muted">
      <Image
        alt=""
        src={icon}
        width={iconSize}
        height={iconSize}
        className="shrink-0"
      />
      {children}
    </p>
  );
}
