import type { ReactNode } from "react";

import { OfficeHoursComingSoon } from "@/components/office-hours/office-hours-coming-soon";
import { Edition } from "@/interfaces/edition";
import { requireEdition } from "@/lib/server/edition";
import { officeHoursEnabled } from "@/lib/server/office-hours-switch";

/** The proxy closes this tree outside ODTÜ, but it skips paths with a dot, which a [courseId] segment can carry. */
export default async function OfficeHoursLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireEdition(Edition.Odtu);
  // ODTÜClass launches carry their own session, not the app's, so the switch is read here rather than from it.
  if (!officeHoursEnabled()) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <OfficeHoursComingSoon />
      </main>
    );
  }
  return children;
}
