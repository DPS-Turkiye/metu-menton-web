"use client";

import { useAdviseeProfile } from "@/hooks/use-institution-record";
import { sharedInterests } from "@/lib/student-interests";

/**
 * An advisee's interests and goal for the academician's student profile. Asks only for an advisee: the endpoint answers nothing for anyone else's student.
 */
export function useAdviseeInterests(userId: string) {
  const query = useAdviseeProfile(userId);
  const profile = query.data ?? null;
  return {
    /** null while loading, after a failure, or when the backend says this is not their advisee. */
    profile,
    ...sharedInterests(profile),
    isLoading: query.isLoading,
    error: query.error,
    retry: () => void query.refetch(),
    isRetrying: query.isRefetching,
  };
}
