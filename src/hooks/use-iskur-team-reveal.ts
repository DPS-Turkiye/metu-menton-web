"use client";

import { useQuery } from "@tanstack/react-query";

import {
  IskurPlacementStatus,
  IskurTeamRole,
} from "@/interfaces/iskur-workspace";
import { ClientApiError } from "@/lib/client/api";
import { getIskurTeamReveal } from "@/lib/client/iskur-onboarding";
import { revealGroups } from "@/lib/iskur-onboarding";

export const iskurTeamRevealQueryKey = ["iskur-team-reveal"] as const;

const NOT_FOUND = 404;

/**
 * "Ekibin belli oldu" on the student's Ana Sayfa (Figma 05). Someone who is not an İŞKUR intern gets nothing: the
 * backend answers 404 and the home shows its usual content.
 */
export function useIskurTeamReveal() {
  const query = useQuery({
    queryKey: iskurTeamRevealQueryKey,
    queryFn: async () => {
      try {
        return await getIskurTeamReveal();
      } catch (error) {
        if (error instanceof ClientApiError && error.status === NOT_FOUND)
          return null;
        throw error;
      }
    },
    retry: false,
  });
  const reveal = query.data ?? null;
  const placement = reveal?.placement ?? null;
  return {
    isLoading: query.isLoading,
    reveal,
    placement,
    provisional: placement?.status === IskurPlacementStatus.Provisional,
    leads: placement?.myRole === IskurTeamRole.Leader,
    groups: placement ? revealGroups(placement.team.people) : [],
  };
}
