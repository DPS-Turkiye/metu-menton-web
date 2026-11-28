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
import { isUnaffected } from "@/lib/availability-impact";
import { fixtureResponse } from "@/lib/client/fixtures/fixture-response";
import {
  AvailabilitySaveResult,
  type AvailabilitySaveOutcome,
} from "@/types/academician-office-hours";
import {
  answerSampleRequest,
  cancelSampleAppointment,
  sampleState,
  saveSampleAvailability,
  saveSampleProfile,
  takeSampleChange,
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
  confirmed: OfficeHoursAffectedItem[] | null,
): Promise<AvailabilitySaveOutcome> {
  if (confirmed !== null && sampleState().holdsConfirm) {
    return new Promise(() => {
      // Never settles: the save stays running for as long as the test looks.
    });
  }
  return sample((): AvailabilitySaveOutcome => {
    const { impact } = sampleState();
    if (confirmed === null && !isUnaffected(impact)) {
      return { result: AvailabilitySaveResult.Review, impact, changed: false };
    }
    if (confirmed !== null && takeSampleChange()) {
      return { result: AvailabilitySaveResult.Review, impact, changed: true };
    }
    return {
      result: AvailabilitySaveResult.Saved,
      availability: saveSampleAvailability(payload),
    };
  });
}

export function getOfficeHoursProfile(): Promise<OfficeHoursProfile> {
  return sample(() => sampleState().profile);
}

export function saveOfficeHoursProfile(
  settings: OfficeHoursProfile,
): Promise<OfficeHoursProfile> {
  return sample(() => saveSampleProfile(settings));
}
