import { IskurSupportActivitiesView } from "@/components/coordinator/iskur-support-activities-view";

export default async function AdminProgramIskurSupportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IskurSupportActivitiesView programId={id} />;
}
