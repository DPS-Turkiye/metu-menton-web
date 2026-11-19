import type { ReactNode } from "react";

import { Edition } from "@/interfaces/edition";
import { requireEdition } from "@/lib/server/edition";

export default async function IskurLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireEdition(Edition.Odtu);
  return children;
}
