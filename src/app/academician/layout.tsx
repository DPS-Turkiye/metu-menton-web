import type { ReactNode } from "react";

import { AcademicianFrame } from "@/components/academician/academician-frame";
import { OfficeHoursGate } from "@/components/office-hours/office-hours-gate";
import { Edition } from "@/interfaces/edition";
import { requireEdition } from "@/lib/server/edition";

export default async function AcademicianLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireEdition(Edition.Odtu);
  // The whole workspace is Office Hours, so every page waits behind the switch.
  return (
    <AcademicianFrame>
      <OfficeHoursGate>{children}</OfficeHoursGate>
    </AcademicianFrame>
  );
}
