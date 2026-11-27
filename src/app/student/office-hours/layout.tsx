import type { ReactNode } from "react";

import { OfficeHoursGate } from "@/components/office-hours/office-hours-gate";

export default function StudentOfficeHoursLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OfficeHoursGate>{children}</OfficeHoursGate>;
}
