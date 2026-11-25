"use client";

import { useQuery } from "@tanstack/react-query";

import { useReceivedPeerRequests } from "@/hooks/use-peer-mentor-give";
import { getPeerMentee } from "@/lib/client/peer-mentoring";
import { sharedInterests } from "@/lib/student-interests";

/** A mentee as their peer mentor sees them, with the requests they sent this mentor. */
export function usePeerMentee(menteeId: string) {
  const query = useQuery({
    queryKey: ["peer-mentee", menteeId],
    queryFn: () => getPeerMentee(menteeId),
    retry: false,
  });
  const requests = useReceivedPeerRequests();
  const profile = query.data ?? null;
  return {
    isLoading: query.isLoading,
    error: query.error,
    /** null while loading, after a failure, or when this person is not their mentee. */
    mentee: profile?.mentee ?? null,
    interests: profile ? sharedInterests(profile) : null,
    requests: [...requests.waiting, ...requests.mentees].filter(
      (request) => request.mentee.userId === menteeId,
    ),
  };
}
