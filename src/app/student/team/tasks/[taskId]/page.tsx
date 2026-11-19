import { IskurTaskDetailView } from "@/components/student/iskur-task-detail-view";

export default async function StudentTeamTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <IskurTaskDetailView taskId={taskId} />;
}
