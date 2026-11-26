import type { AcademicianAvailability } from "@/interfaces/academician-office-hours";
import type { OfficeHoursAvailabilityImpact } from "@/interfaces/office-hours-me";

/** What one line of the academician's availability describes ("Müsaitliğim"). */
export enum AvailabilityItemKind {
  Recurring = "recurring",
  OneOff = "oneOff",
  Unavailable = "unavailable",
}

/** Why an availability form can't be saved; each has its own message. */
export enum AvailabilityFormError {
  NeedFields = "needFields",
  EndAfterStart = "endAfterStart",
  TooShort = "tooShort",
  Overlap = "overlap",
  Past = "past",
  InsideDayOff = "insideDayOff",
  HidesOneOff = "hidesOneOff",
}

/** What the "Yaklaşan randevu" cell of an advisee shows. */
export enum AdviseeNextKind {
  Appointment = "appointment",
  PendingRequest = "pendingRequest",
}

/** The badge of one line in "Seninle randevuları". */
export enum StudentHistoryBadge {
  Pending = "pending",
  Proposed = "proposed",
  Confirmed = "confirmed",
  Completed = "completed",
  Cancelled = "cancelled",
}

/** Where a student's profile was opened from; its "←" link goes back there. */
export enum StudentProfileOrigin {
  Appointments = "appointments",
  Advisees = "advisees",
}

/** How a save of the hours ended: saved, or stopped to show what it touches first (FR-OH-29). */
export enum AvailabilitySaveResult {
  Saved = "saved",
  Review = "review",
}

export type AvailabilitySaveOutcome =
  | {
      result: AvailabilitySaveResult.Saved;
      availability: AcademicianAvailability;
    }
  | {
      result: AvailabilitySaveResult.Review;
      impact: OfficeHoursAvailabilityImpact;
      /** The list changed after the academician saw it, so the save was refused. */
      changed: boolean;
    };
