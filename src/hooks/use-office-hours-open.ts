"use client";

import { useSession } from "@/components/providers/session-provider";

/**
 * Whether Office Hours is open to the signed-in person, from the session the server stamps on every read.
 * - `known`: a session is in. Until then (loading, or a read that failed; the next focus asks again) the gate shows
 *   neither the screens nor "coming soon", so a hiccup never says "coming soon" where the switch is on.
 * - `settled`: the session read has finished, either way. Lists that mix in Office Hours wait for this, then load
 *   their other half even when the session could not be read.
 */
export function useOfficeHoursOpen() {
  const { session, isLoading } = useSession();
  return {
    open: session?.officeHoursOpen === true,
    known: !isLoading && session !== null,
    settled: !isLoading,
  };
}
