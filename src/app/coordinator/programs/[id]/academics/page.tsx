import { ProgramAcademicsView } from "@/components/coordinator/program-academics-view";
import { OfficeHoursGate } from "@/components/office-hours/office-hours-gate";

export default async function CoordinatorProgramAcademicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <OfficeHoursGate>
      <ProgramAcademicsView programId={id} />
    </OfficeHoursGate>
  );
}
