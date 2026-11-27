"use client";

import { useSession } from "@/components/providers/session-provider";

/**
 * Whether Office Hours is open to the signed-in person, from the session the server stamps on every read. `known`
 * stays false while the session loads; until then the feature counts as closed, so no Office Hours call starts
 * before the answer is in.
 */
export function useOfficeHoursOpen() {
  const { session, isLoading } = useSession();
  return {
    open: session?.officeHoursOpen === true,
    known: !isLoading,
  };
}
