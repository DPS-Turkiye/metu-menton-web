import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";

/** The outlined "← back" at the top of a hocam page (Figma 3.3–3.5): a link, or a step back inside the page. */
export function BackButton({
  children,
  ...target
}: {
  children: ReactNode;
} & ({ href: string } | { onClick: () => void })) {
  return (
    <Button
      variant={ButtonVariant.Ghost}
      size={ButtonSize.Small}
      className="w-fit"
      {...target}
    >
      <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
      {children}
    </Button>
  );
}
