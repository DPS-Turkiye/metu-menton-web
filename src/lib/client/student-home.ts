import type { StudentHome } from "@/interfaces/student-home";
import { getStudentAppointments } from "@/lib/client/student-appointments";
import { getStudentProfileCompletion } from "@/lib/client/student-profile-completion";

export async function getStudentHome(
  officeHoursOpen: boolean,
): Promise<StudentHome> {
  const [profile, appointments] = await Promise.all([
    getStudentProfileCompletion(),
    getStudentAppointments(officeHoursOpen),
  ]);
  return {
    profileCompleted: profile.completed || profile.skipped,
    appointments,
  };
}
