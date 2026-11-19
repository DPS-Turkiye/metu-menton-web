import { IskurMessagesView } from "@/components/iskur/iskur-messages-view";
import { firstSearchParam } from "@/lib/iskur-channels";

export default async function StudentMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <IskurMessagesView
      linkedChannelId={firstSearchParam((await searchParams).channel)}
    />
  );
}
