import type {
  AcademicianAvailability,
  UpdateAcademicianAvailabilityPayload,
} from "@/interfaces/academician-office-hours";
import type {
  OfficeHoursAcademicianMeeting,
  OfficeHoursAffectedItem,
  OfficeHoursAlternativeInput,
  OfficeHoursAnswerInput,
  OfficeHoursAvailabilityImpact,
  OfficeHoursInboxRequest,
  OfficeHoursListedAcademician,
  OfficeHoursProfile,
  OfficeHoursRequestInput,
  OfficeHoursStudentRequest,
  OfficeHoursTimeRange,
} from "@/interfaces/office-hours-me";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

// Office hours for the signed-in Menton account (ODTÜ edition), through the app's own /api/office-hours/me routes.
const BASE = "/api/office-hours/me";

export async function getMyOfficeHoursAvailability() {
  return requireSuccess(
    await httpClient.get<AcademicianAvailability>(`${BASE}/availability`),
  );
}

/** Sent with a save: what the academician was shown (FR-OH-29). Left out, the backend checks nothing. */
type AvailabilitySave = UpdateAcademicianAvailabilityPayload & {
  confirmedAffected?: OfficeHoursAffectedItem[];
};

export async function previewMyOfficeHoursAvailability(
  payload: UpdateAcademicianAvailabilityPayload,
) {
  return requireSuccess(
    await httpClient.post<OfficeHoursAvailabilityImpact>(
      `${BASE}/availability/preview`,
      payload,
    ),
  );
}

export async function saveMyOfficeHoursAvailability(payload: AvailabilitySave) {
  return requireSuccess(
    await httpClient.put<AcademicianAvailability>(
      `${BASE}/availability`,
      payload,
    ),
  );
}

export async function getMyOfficeHoursProfile() {
  return requireSuccess(
    await httpClient.get<OfficeHoursProfile>(`${BASE}/profile`),
  );
}

export async function saveMyOfficeHoursProfile(profile: OfficeHoursProfile) {
  return requireSuccess(
    await httpClient.put<OfficeHoursProfile>(`${BASE}/profile`, profile),
  );
}

export async function getOfficeHoursInbox() {
  return requireSuccess(
    await httpClient.get<OfficeHoursInboxRequest[]>(`${BASE}/inbox`),
  );
}

export async function answerOfficeHoursRequest(
  requestId: string,
  answer: OfficeHoursAnswerInput,
) {
  return requireSuccess(
    await httpClient.post<OfficeHoursInboxRequest>(
      `${BASE}/requests/${encodeURIComponent(requestId)}/decision`,
      answer,
    ),
  );
}

export async function cancelOfficeHoursMeeting(
  requestId: string,
  reason: string | null,
) {
  requireSuccess(
    await httpClient.post<void>(
      `${BASE}/requests/${encodeURIComponent(requestId)}/cancel`,
      { reason },
    ),
  );
}

export async function getAcademicianOfficeHoursMeetings() {
  return requireSuccess(
    await httpClient.get<OfficeHoursAcademicianMeeting[]>(`${BASE}/meetings`),
  );
}

export async function getListedAcademicians() {
  return requireSuccess(
    await httpClient.get<OfficeHoursListedAcademician[]>(
      `${BASE}/academicians`,
    ),
  );
}

export async function getListedAcademician(academicianId: string) {
  return requireSuccess(
    await httpClient.get<OfficeHoursListedAcademician>(
      `${BASE}/academicians/${encodeURIComponent(academicianId)}`,
    ),
  );
}

export async function getAcademicianOpenSlots(academicianId: string) {
  return requireSuccess(
    await httpClient.get<OfficeHoursTimeRange[]>(
      `${BASE}/academicians/${encodeURIComponent(academicianId)}/slots`,
    ),
  );
}

export async function sendOfficeHoursRequest(input: OfficeHoursRequestInput) {
  return requireSuccess(
    await httpClient.post<OfficeHoursStudentRequest>(`${BASE}/requests`, input),
  );
}

export async function getMyOfficeHoursRequests() {
  return requireSuccess(
    await httpClient.get<OfficeHoursStudentRequest[]>(`${BASE}/appointments`),
  );
}

export async function answerOfficeHoursAlternative(
  requestId: string,
  answer: OfficeHoursAlternativeInput,
) {
  return requireSuccess(
    await httpClient.post<OfficeHoursStudentRequest>(
      `${BASE}/requests/${encodeURIComponent(requestId)}/alternative`,
      answer,
    ),
  );
}
