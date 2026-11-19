// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { IskurMessagesView } from "@/components/iskur/iskur-messages-view";
import { ProgramTab } from "@/lib/coordinator-program-detail";

/** Katılımcılar › İŞKUR Kanalları: the 6.1 Mesajlar screen as a coordinator of this program reaches it. */
export function IskurChannelsView({
  programId,
  linkedChannelId,
}: {
  programId: string;
  linkedChannelId: string | null;
}) {
  return (
    <ProgramDetailFrame programId={programId} tab={ProgramTab.IskurChannels}>
      {() => (
        <IskurMessagesView
          programId={programId}
          linkedChannelId={linkedChannelId}
          framed
        />
      )}
    </ProgramDetailFrame>
  );
}
