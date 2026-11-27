import { ProgramAppointmentsView } from "@/components/coordinator/program-appointments-view";
import { OfficeHoursGate } from "@/components/office-hours/office-hours-gate";

export default async function CoordinatorProgramAppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <OfficeHoursGate>
      <ProgramAppointmentsView programId={id} />
    </OfficeHoursGate>
  );
}
