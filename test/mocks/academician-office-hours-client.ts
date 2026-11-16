import type {
  AcademicianAppointment,
  AcademicianAvailability,
  OfficeHoursAnswer,
  OfficeHoursProfileSettings,
  OfficeHoursRequest,
  UpdateAcademicianAvailabilityPayload,
} from "@/interfaces/academician-office-hours";
import { fixtureResponse } from "@/lib/client/fixtures/fixture-response";
import {
  answerSampleRequest,
  cancelSampleAppointment,
  sampleState,
  saveSampleAvailability,
  saveSampleProfile,
} from "@test/fixtures/academician-office-hours-sample-store";

// The academician Office Hours client backed by the in-memory sample, for screen tests that walk through answering,
// cancelling and editing without a backend. Use with
// vi.mock("@/lib/client/academician-office-hours", () => import("@test/mocks/academician-office-hours-client")).

async function sample<T>(run: () => T): Promise<T> {
  return fixtureResponse(run());
}

export function getAcademicianRequests(): Promise<OfficeHoursRequest[]> {
  return sample(() => sampleState().requests);
}

export function answerAcademicianRequest(
  id: string,
  answer: OfficeHoursAnswer,
): Promise<OfficeHoursRequest | null> {
  return sample(() => answerSampleRequest(id, answer));
}

export function getAcademicianAppointments(): Promise<
  AcademicianAppointment[]
> {
  return sample(() => sampleState().appointments);
}

export function cancelAcademicianAppointment(
  appointment: AcademicianAppointment,
  reason: string | null,
): Promise<void> {
  return sample(() => {
    cancelSampleAppointment(appointment.id, reason);
  });
}

export function getAcademicianAvailability(): Promise<AcademicianAvailability> {
  return sample(() => sampleState().availability);
}

export function saveAcademicianAvailability(
  payload: UpdateAcademicianAvailabilityPayload,
): Promise<AcademicianAvailability> {
  return sample(() => saveSampleAvailability(payload));
}

export function getOfficeHoursProfileSettings(): Promise<OfficeHoursProfileSettings> {
  return sample(() => sampleState().profile);
}

export function saveOfficeHoursProfileSettings(
  settings: OfficeHoursProfileSettings,
): Promise<OfficeHoursProfileSettings> {
  return sample(() => saveSampleProfile(settings));
}
