import type {
  OfficeHoursAffectedItem,
  OfficeHoursAvailabilityImpact,
} from "@/interfaces/office-hours-me";

/** Nothing booked or waiting is left outside the new hours, so the save needs no second look. */
export function isUnaffected(impact: OfficeHoursAvailabilityImpact) {
  return impact.meetings.length === 0 && impact.requests.length === 0;
}

/** Everything the academician was shown, as the save sends it back; a status is kept so a change of state counts. */
export function affectedItems(
  impact: OfficeHoursAvailabilityImpact,
): OfficeHoursAffectedItem[] {
  return [...impact.meetings, ...impact.requests].map(
    ({ requestId, status }) => ({ requestId, status }),
  );
}
