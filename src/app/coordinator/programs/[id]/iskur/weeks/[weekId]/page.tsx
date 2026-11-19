import { IskurFallbackWeekView } from "@/components/coordinator/iskur-fallback-weeks-view";

export default async function CoordinatorProgramIskurWeekPage({
  params,
}: {
  params: Promise<{ id: string; weekId: string }>;
}) {
  const { id, weekId } = await params;
  return <IskurFallbackWeekView key={weekId} programId={id} weekId={weekId} />;
}
