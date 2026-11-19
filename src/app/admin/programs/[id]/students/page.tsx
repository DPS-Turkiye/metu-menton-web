import { ProgramStudentsView } from "@/components/coordinator/program-students-view";

export default async function AdminProgramStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProgramStudentsView programId={id} />;
}
