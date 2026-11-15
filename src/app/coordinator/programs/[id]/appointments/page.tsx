import { ProgramAppointmentsView } from "@/components/coordinator/program-appointments-view";

export default async function CoordinatorProgramAppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProgramAppointmentsView programId={id} />;
}
