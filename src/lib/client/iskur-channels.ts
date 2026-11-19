import type {
  IskurChannelList,
  IskurChannelPreferences,
  IskurMessage,
  IskurMessageInput,
  IskurMessagePage,
  IskurMessageReceipts,
} from "@/interfaces/iskur-channels";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";
import type { MutableChannelKind } from "@/lib/iskur-channels";

const BASE = "/api/iskur";
const channel = (id: string) => `${BASE}/channels/${encodeURIComponent(id)}`;
const message = (id: string) => `${BASE}/messages/${encodeURIComponent(id)}`;

export async function getIskurChannels(programId: string | null = null) {
  return requireSuccess(
    await httpClient.get<IskurChannelList>(`${BASE}/channels`, {
      params: programId ? { programId } : {},
    }),
  );
}

export async function getIskurMessages(
  channelId: string,
  before: string | null = null,
) {
  return requireSuccess(
    await httpClient.get<IskurMessagePage>(`${channel(channelId)}/messages`, {
      params: before ? { before } : {},
    }),
  );
}

export async function postIskurMessage(
  channelId: string,
  input: IskurMessageInput,
) {
  return requireSuccess(
    await httpClient.post<IskurMessage>(
      `${channel(channelId)}/messages`,
      input,
    ),
  );
}

export async function markIskurChannelRead(channelId: string) {
  return requireSuccess(
    await httpClient.post<null>(`${channel(channelId)}/read`),
  );
}

export async function acknowledgeIskurMessage(messageId: string) {
  return requireSuccess(
    await httpClient.post<IskurMessage>(`${message(messageId)}/acknowledge`),
  );
}

export async function getIskurMessageReceipts(messageId: string) {
  return requireSuccess(
    await httpClient.get<IskurMessageReceipts>(
      `${message(messageId)}/receipts`,
    ),
  );
}

export async function getIskurChannelPreferences(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurChannelPreferences>(
      `${BASE}/channel-preferences`,
      { params: { programId } },
    ),
  );
}

export async function updateIskurChannelPreferences(
  programId: string,
  mutedKinds: MutableChannelKind[],
) {
  return requireSuccess(
    await httpClient.put<IskurChannelPreferences>(
      `${BASE}/channel-preferences`,
      { programId, mutedKinds },
    ),
  );
}
