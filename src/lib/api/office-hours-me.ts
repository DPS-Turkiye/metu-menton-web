import "server-only";

import type {
  OfficeHoursAcademicianMeeting,
  OfficeHoursAffectedItem,
  OfficeHoursAlternativeInput,
  OfficeHoursAnswerInput,
  OfficeHoursAvailabilityImpact,
  OfficeHoursCancelInput,
  OfficeHoursInboxRequest,
  OfficeHoursListedAcademician,
  OfficeHoursProfile,
  OfficeHoursRequestInput,
  OfficeHoursStudentRequest,
  OfficeHoursTimeRange,
} from "@/interfaces/office-hours-me";
import type { BackendOfficeHoursAvailability } from "@/lib/api/lti";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

// Office hours for the signed-in Menton account (ODTÜ edition); the actor always comes from the session.
const BASE = "/api/office-hours/me";

type AvailabilityPayload = Omit<
  BackendOfficeHoursAvailability,
  "rules" | "exceptions" | "oneOffs"
> & {
  rules: Omit<BackendOfficeHoursAvailability["rules"][number], "id">[];
  exceptions: Omit<
    BackendOfficeHoursAvailability["exceptions"][number],
    "id"
  >[];
  /** Left out, the saved one-off hours stay. */
  oneOffs?:
    | {
        id?: string | undefined;
        startsAt: string;
        endsAt: string;
        place: string | null;
      }[]
    | undefined;
  confirmedAffected?: OfficeHoursAffectedItem[] | undefined;
};

export function fetchMyOfficeHoursAvailability(actorId: string) {
  return backendRequest<BackendOfficeHoursAvailability>({
    method: HttpMethod.Get,
    url: `${BASE}/availability`,
    params: { actorId },
  });
}

export function saveMyOfficeHoursAvailability(
  actorId: string,
  payload: AvailabilityPayload,
) {
  return backendRequest<BackendOfficeHoursAvailability>({
    method: HttpMethod.Put,
    url: `${BASE}/availability`,
    params: { actorId },
    data: payload,
  });
}

/** What saving these hours would leave outside them, without saving (FR-OH-29). */
export function previewMyOfficeHoursAvailability(
  actorId: string,
  payload: AvailabilityPayload,
) {
  return backendRequest<OfficeHoursAvailabilityImpact>({
    method: HttpMethod.Post,
    url: `${BASE}/availability/preview`,
    params: { actorId },
    data: payload,
  });
}

export function fetchMyOfficeHoursProfile(actorId: string) {
  return backendRequest<OfficeHoursProfile>({
    method: HttpMethod.Get,
    url: `${BASE}/profile`,
    params: { actorId },
  });
}

export function saveMyOfficeHoursProfile(
  actorId: string,
  profile: OfficeHoursProfile,
) {
  return backendRequest<OfficeHoursProfile>({
    method: HttpMethod.Put,
    url: `${BASE}/profile`,
    params: { actorId },
    data: profile,
  });
}

export function fetchOfficeHoursInbox(actorId: string) {
  return backendRequest<OfficeHoursInboxRequest[]>({
    method: HttpMethod.Get,
    url: `${BASE}/inbox`,
    params: { actorId },
  });
}

export function answerOfficeHoursRequest(
  actorId: string,
  requestId: string,
  answer: OfficeHoursAnswerInput,
) {
  return backendRequest<OfficeHoursInboxRequest>({
    method: HttpMethod.Post,
    url: `${BASE}/requests/${encodeURIComponent(requestId)}/decision`,
    params: { actorId },
    data: answer,
  });
}

/** Either side calls off a booked meeting; the backend answers 204, or 409 once it has started. */
export function cancelOfficeHoursMeeting(
  actorId: string,
  requestId: string,
  cancellation: OfficeHoursCancelInput,
) {
  return backendRequest<void>({
    method: HttpMethod.Post,
    url: `${BASE}/requests/${encodeURIComponent(requestId)}/cancel`,
    params: { actorId },
    data: cancellation,
  });
}

export function fetchAcademicianOfficeHoursMeetings(actorId: string) {
  return backendRequest<OfficeHoursAcademicianMeeting[]>({
    method: HttpMethod.Get,
    url: `${BASE}/meetings`,
    params: { actorId },
  });
}

export function fetchListedAcademicians(actorId: string) {
  return backendRequest<OfficeHoursListedAcademician[]>({
    method: HttpMethod.Get,
    url: `${BASE}/academicians`,
    params: { actorId },
  });
}

export function fetchListedAcademician(actorId: string, academicianId: string) {
  return backendRequest<OfficeHoursListedAcademician>({
    method: HttpMethod.Get,
    url: `${BASE}/academicians/${encodeURIComponent(academicianId)}`,
    params: { actorId },
  });
}

export function fetchAcademicianOpenSlots(
  actorId: string,
  academicianId: string,
) {
  return backendRequest<OfficeHoursTimeRange[]>({
    method: HttpMethod.Get,
    url: `${BASE}/academicians/${encodeURIComponent(academicianId)}/slots`,
    params: { actorId },
  });
}

export function createOfficeHoursRequest(
  actorId: string,
  input: OfficeHoursRequestInput,
) {
  return backendRequest<OfficeHoursStudentRequest>({
    method: HttpMethod.Post,
    url: `${BASE}/requests`,
    params: { actorId },
    data: input,
  });
}

export function fetchMyOfficeHoursRequests(actorId: string) {
  return backendRequest<OfficeHoursStudentRequest[]>({
    method: HttpMethod.Get,
    url: `${BASE}/appointments`,
    params: { actorId },
  });
}

export function answerOfficeHoursAlternative(
  actorId: string,
  requestId: string,
  answer: OfficeHoursAlternativeInput,
) {
  return backendRequest<OfficeHoursStudentRequest>({
    method: HttpMethod.Post,
    url: `${BASE}/requests/${encodeURIComponent(requestId)}/alternative`,
    params: { actorId },
    data: answer,
  });
}
