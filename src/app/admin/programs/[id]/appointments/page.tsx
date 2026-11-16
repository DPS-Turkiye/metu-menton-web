import { ProgramAppointmentsView } from "@/components/coordinator/program-appointments-view";

export default async function AdminProgramAppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProgramAppointmentsView programId={id} />;
}
