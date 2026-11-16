import type {
  AcademicianAppointment,
  AcademicianAvailability,
  OfficeHoursAnswer,
  OfficeHoursProfileSettings,
  OfficeHoursRequest,
  UpdateAcademicianAvailabilityPayload,
} from "@/interfaces/academician-office-hours";
import {
  toAcademicianAppointment,
  toAcademicianAvailability,
  toAnswerInput,
  toOfficeHoursRequest,
} from "@/lib/academician-office-hours-me";
import {
  answerOfficeHoursRequest,
  cancelOfficeHoursMeeting,
  getAcademicianOfficeHoursMeetings,
  getMyOfficeHoursAvailability,
  getMyOfficeHoursProfile,
  getOfficeHoursInbox,
  saveMyOfficeHoursAvailability,
  saveMyOfficeHoursProfile,
} from "@/lib/client/office-hours-me";

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

/** Weekly ranges, one-off hours, days off and the numbers, saved as a whole. */
export async function saveAcademicianAvailability(
  payload: UpdateAcademicianAvailabilityPayload,
): Promise<AcademicianAvailability> {
  return toAcademicianAvailability(
    await saveMyOfficeHoursAvailability(payload),
  );
}

export async function getOfficeHoursProfileSettings(): Promise<OfficeHoursProfileSettings> {
  const { defaultPlace, onlineLink, contactEmail } =
    await getMyOfficeHoursProfile();
  return { defaultPlace, onlineLink, contactEmail };
}

/**
 * Saves where and how students meet them. Whether students see them at all (`listed`) is not on this screen yet
 * (G6), so the saved value is read first and kept as it is.
 */
export async function saveOfficeHoursProfileSettings(
  settings: OfficeHoursProfileSettings,
): Promise<OfficeHoursProfileSettings> {
  const { listed } = await getMyOfficeHoursProfile();
  const saved = await saveMyOfficeHoursProfile({ ...settings, listed });
  return {
    defaultPlace: saved.defaultPlace,
    onlineLink: saved.onlineLink,
    contactEmail: saved.contactEmail,
  };
}
