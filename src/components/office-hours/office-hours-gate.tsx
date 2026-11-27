"use client";

import type { ReactNode } from "react";

import { OfficeHoursComingSoon } from "@/components/office-hours/office-hours-coming-soon";
import { useOfficeHoursOpen } from "@/hooks/use-office-hours-open";

/**
 * Renders the Office Hours screens only once the feature is open to this person, and the coming-soon screen
 * otherwise. The screens are not mounted while closed or while the session loads, so their queries never start.
 */
export function OfficeHoursGate({ children }: { children: ReactNode }) {
  const { open, known } = useOfficeHoursOpen();
  if (!known) return null;
  return open ? children : <OfficeHoursComingSoon />;
}
