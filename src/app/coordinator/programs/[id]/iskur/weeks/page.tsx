import { IskurFallbackWeeksView } from "@/components/coordinator/iskur-fallback-weeks-view";

export default async function CoordinatorProgramIskurWeeksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IskurFallbackWeeksView programId={id} />;
}
