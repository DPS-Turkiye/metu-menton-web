import { notFound } from "next/navigation";

import { officeHoursEnabled } from "@/lib/server/office-hours-switch";

/**
 * Where ODTÜClass launches land while Office Hours is coming soon. The layout shows the message in place of every
 * page here, this one included; once Office Hours opens, the address has nothing to show.
 */
export default function OfficeHoursComingSoonPage() {
  if (officeHoursEnabled()) notFound();
  return null;
}
