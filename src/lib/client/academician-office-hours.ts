import type {
  AcademicianAppointment,
  AcademicianAvailability,
  OfficeHoursAnswer,
  OfficeHoursRequest,
  UpdateAcademicianAvailabilityPayload,
} from "@/interfaces/academician-office-hours";
import type {
  OfficeHoursAffectedItem,
  OfficeHoursProfile,
} from "@/interfaces/office-hours-me";
import { upcomingOneOffs } from "@/lib/academician-availability";
import {
  toAcademicianAppointment,
  toAcademicianAvailability,
  toAnswerInput,
  toOfficeHoursRequest,
} from "@/lib/academician-office-hours-me";
import { isUnaffected } from "@/lib/availability-impact";
import { ClientApiError } from "@/lib/client/api";
import {
  answerOfficeHoursRequest,
  cancelOfficeHoursMeeting,
  getAcademicianOfficeHoursMeetings,
  getMyOfficeHoursAvailability,
  getMyOfficeHoursProfile,
  getOfficeHoursInbox,
  previewMyOfficeHoursAvailability,
  saveMyOfficeHoursAvailability,
  saveMyOfficeHoursProfile,
} from "@/lib/client/office-hours-me";
import { OFFICE_HOURS_AFFECTED_BOOKINGS_CHANGED } from "@/lib/const";
import {
  AvailabilitySaveResult,
  type AvailabilitySaveOutcome,
} from "@/types/academician-office-hours";

// The academician's Office Hours through /api/office-hours/me (ODTÜ-signed-in accounts, Moodle course requests
// included once their person is linked). The screens keep their own shapes; lib/academician-office-hours-me maps.

export async function getAcademicianRequests(): Promise<OfficeHoursRequest[]> {
  return (await getOfficeHoursInbox())
    .map(toOfficeHoursRequest)
    .filter((request) => request !== null);
}

/** The answered request, or null when the answer settled it (accepted or declined) and it left the open list. */
export async function answerAcademicianRequest(
  id: string,
  answer: OfficeHoursAnswer,
): Promise<OfficeHoursRequest | null> {
  return toOfficeHoursRequest(
    await answerOfficeHoursRequest(id, toAnswerInput(answer)),
  );
}

export async function getAcademicianAppointments(): Promise<
  AcademicianAppointment[]
> {
  return (await getAcademicianOfficeHoursMeetings()).map(
    toAcademicianAppointment,
  );
}

/** Calls off a booked meeting; the student is e-mailed and the meeting leaves Randevularım. */
export async function cancelAcademicianAppointment(
  appointment: AcademicianAppointment,
  reason: string | null,
): Promise<void> {
  await cancelOfficeHoursMeeting(appointment.requestId, reason);
}

export async function getAcademicianAvailability(): Promise<AcademicianAvailability> {
  return toAcademicianAvailability(await getMyOfficeHoursAvailability());
}

/**
 * Weekly ranges, one-off hours still ahead, days off and the numbers, saved as a whole once the academician has
 * seen the meetings and requests the change leaves out (FR-OH-29). With `confirmed` null nothing has been shown
 * yet: a change that touches nothing saves at once, any other stops for review. A save the backend refuses because
 * the list changed meanwhile comes back for review with the fresh list.
 */
export async function saveAcademicianAvailability(
  payload: UpdateAcademicianAvailabilityPayload,
  confirmed: OfficeHoursAffectedItem[] | null,
): Promise<AvailabilitySaveOutcome> {
  // Preview and save must see the same hours, so ended one-offs are dropped once, here.
  const hours = {
    ...payload,
    oneOffs: upcomingOneOffs(payload.oneOffs, new Date()),
  };
  if (confirmed === null) {
    const impact = await previewMyOfficeHoursAvailability(hours);
    if (!isUnaffected(impact)) {
      return { result: AvailabilitySaveResult.Review, impact, changed: false };
    }
  }
  try {
    return await saveConfirmed(hours, confirmed ?? []);
  } catch (error) {
    if (
      !(error instanceof ClientApiError) ||
      error.code !== OFFICE_HOURS_AFFECTED_BOOKINGS_CHANGED
    ) {
      throw error;
    }
    const fresh = await previewMyOfficeHoursAvailability(hours);
    // What changed is already gone again (a request taken back, say): nothing is left to show, so save once more.
    if (isUnaffected(fresh)) return saveConfirmed(hours, []);
    return {
      result: AvailabilitySaveResult.Review,
      impact: fresh,
      changed: true,
    };
  }
}

async function saveConfirmed(
  hours: UpdateAcademicianAvailabilityPayload,
  confirmedAffected: OfficeHoursAffectedItem[],
): Promise<AvailabilitySaveOutcome> {
  const saved = await saveMyOfficeHoursAvailability({
    ...hours,
    confirmedAffected,
  });
  return {
    result: AvailabilitySaveResult.Saved,
    availability: toAcademicianAvailability(saved),
  };
}

export function getOfficeHoursProfileSettings(): Promise<OfficeHoursProfile> {
  return getMyOfficeHoursProfile();
}

/** Profilim sets every field, so the whole profile is sent and nothing is read back first. */
export function saveOfficeHoursProfileSettings(
  profile: OfficeHoursProfile,
): Promise<OfficeHoursProfile> {
  return saveMyOfficeHoursProfile(profile);
}
