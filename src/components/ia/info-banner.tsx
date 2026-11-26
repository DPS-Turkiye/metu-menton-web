import Image from "next/image";
import type { ReactNode } from "react";

/** A filled note at the top of a list (Figma 152:7525): a 16 px info icon and one line of secondary text. */
export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[14px] bg-background-subtle px-4 py-3 type-body-sm text-text-secondary">
      <Image
        alt=""
        src="/ia/icons/info.svg"
        width={16}
        height={16}
        className="mt-0.5 shrink-0"
      />
      {children}
    </p>
  );
}
