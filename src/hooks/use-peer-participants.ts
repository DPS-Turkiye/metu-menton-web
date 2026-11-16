"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useProgramBadges } from "@/hooks/use-program-badges";
import { StudentFilter } from "@/interfaces/badges";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import {
  matchesBadgeFilter,
  matchesCapacityFilter,
  participantCounts,
  peerMentorRows,
} from "@/lib/peer-participants";
import { CapacityFilter } from "@/types/peer-participants";

/**
 * Katılımcılar of a peer program (Figma 152:7963): one roster feeds both sub-tabs and their counts. Öğrenciler
 * filters by "Rozet durumu", Akran Mentorları by "Kapasite"; the badge actions and the row menu come along.
 */
export function usePeerParticipants(
  programId: string,
  tab: ProgramTab.Students | ProgramTab.PeerMentors,
) {
  const t = useTranslations("peerParticipants");
  const badges = useProgramBadges(programId, null);
  const [badgeFilter, setBadgeFilter] = useState(StudentFilter.All);
  const [capacityFilter, setCapacityFilter] = useState(CapacityFilter.All);

  const tabRows =
    tab === ProgramTab.PeerMentors ? peerMentorRows(badges.rows) : badges.rows;
  const rows =
    tab === ProgramTab.PeerMentors
      ? tabRows.filter((row) => matchesCapacityFilter(row, capacityFilter))
      : tabRows.filter((row) => matchesBadgeFilter(row, badgeFilter));

  return {
    ...badges,
    rows,
    /** Nobody on this sub-tab at all, as opposed to nobody matching the filter. */
    tabIsEmpty: tabRows.length === 0,
    /** The sub-tab counts, once the roster has loaded. */
    counts:
      badges.isLoading || badges.loadError
        ? null
        : participantCounts(badges.rows),
    badgeFilter,
    setBadgeFilter,
    badgeOptions: Object.values(StudentFilter).map((value) => ({
      value,
      label: t(`badgeFilter.${value}`),
    })),
    capacityFilter,
    setCapacityFilter,
    capacityOptions: Object.values(CapacityFilter).map((value) => ({
      value,
      label: t(`capacityFilter.${value}`),
    })),
  };
}
