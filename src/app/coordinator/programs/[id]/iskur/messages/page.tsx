import { IskurChannelsView } from "@/components/coordinator/iskur-channels-view";
import { firstSearchParam } from "@/lib/iskur-channels";

export default async function CoordinatorProgramIskurChannelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return (
    <IskurChannelsView
      programId={id}
      linkedChannelId={firstSearchParam((await searchParams).channel)}
    />
  );
}
