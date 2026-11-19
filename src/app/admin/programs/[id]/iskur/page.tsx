import { IskurWorkspaceView } from "@/components/coordinator/iskur-workspace-view";

export default async function AdminProgramIskurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IskurWorkspaceView programId={id} />;
}
