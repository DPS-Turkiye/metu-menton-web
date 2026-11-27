import type { Appointment } from "@/interfaces/appointment";
import { requireSuccess } from "@/lib/client/api";
import { getStudentOfficeHoursAppointments } from "@/lib/client/student-office-hours";
import { httpClient } from "@/lib/http-client";

/**
 * Peer-mentoring sessions from the backend, plus the Office Hours requests when Office Hours is open to the student
 * (while it is coming soon its routes refuse them, so they are not asked for).
 */
export async function getStudentAppointments(
  officeHoursOpen: boolean,
): Promise<Appointment[]> {
  const [peer, officeHours] = await Promise.all([
    httpClient.get<Appointment[]>("/api/student/appointments"),
    officeHoursOpen ? getStudentOfficeHoursAppointments() : [],
  ]);
  return [...requireSuccess(peer), ...officeHours];
}
