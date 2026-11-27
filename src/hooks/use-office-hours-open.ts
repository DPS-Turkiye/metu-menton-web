"use client";

import { useSession } from "@/components/providers/session-provider";

/**
 * Whether Office Hours is open to the signed-in person, from the session the server stamps on every read. `known`
 * stays false until a session is in: while it loads, and when it could not be read (the next focus asks again),
 * so a hiccup neither starts an Office Hours call nor shows "coming soon" where the switch is on. The Office Hours
 * pages are behind sign-in, so a signed-out visitor never waits here.
 */
export function useOfficeHoursOpen() {
  const { session, isLoading } = useSession();
  return {
    open: session?.officeHoursOpen === true,
    known: !isLoading && session !== null,
  };
}
