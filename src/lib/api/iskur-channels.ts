import "server-only";

import type {
  IskurChannelList,
  IskurChannelPreferences,
  IskurMessage,
  IskurMessageInput,
  IskurMessagePage,
  IskurMessageReceipts,
} from "@/interfaces/iskur-channels";
import { HttpMethod } from "@/lib/http-method";
import type { MutableChannelKind } from "@/lib/iskur-channels";
import { backendRequest } from "@/lib/server/backend-client";

const BASE = "/api/iskur";
const channel = (id: string) => `${BASE}/channels/${encodeURIComponent(id)}`;
const message = (id: string) => `${BASE}/messages/${encodeURIComponent(id)}`;

export function fetchIskurChannels(actorId: string, programId: string | null) {
  return backendRequest<IskurChannelList>({
    method: HttpMethod.Get,
    url: `${BASE}/channels`,
    params: programId ? { actorId, programId } : { actorId },
  });
}

export function fetchIskurMessages(
  actorId: string,
  channelId: string,
  before: string | null,
) {
  return backendRequest<IskurMessagePage>({
    method: HttpMethod.Get,
    url: `${channel(channelId)}/messages`,
    params: before ? { actorId, before } : { actorId },
  });
}

export function postIskurMessage(
  actorId: string,
  channelId: string,
  input: IskurMessageInput,
) {
  return backendRequest<IskurMessage>({
    method: HttpMethod.Post,
    url: `${channel(channelId)}/messages`,
    data: { ...input, actorId },
  });
}

export function markIskurChannelRead(actorId: string, channelId: string) {
  return backendRequest<null>({
    method: HttpMethod.Post,
    url: `${channel(channelId)}/read`,
    data: { actorId },
  });
}

export function acknowledgeIskurMessage(actorId: string, messageId: string) {
  return backendRequest<IskurMessage>({
    method: HttpMethod.Post,
    url: `${message(messageId)}/acknowledge`,
    data: { actorId },
  });
}

export function fetchIskurMessageReceipts(actorId: string, messageId: string) {
  return backendRequest<IskurMessageReceipts>({
    method: HttpMethod.Get,
    url: `${message(messageId)}/receipts`,
    params: { actorId },
  });
}

export function fetchIskurChannelPreferences(
  actorId: string,
  programId: string,
) {
  return backendRequest<IskurChannelPreferences>({
    method: HttpMethod.Get,
    url: `${BASE}/channel-preferences`,
    params: { actorId, programId },
  });
}

export function updateIskurChannelPreferences(
  actorId: string,
  programId: string,
  mutedKinds: MutableChannelKind[],
) {
  return backendRequest<IskurChannelPreferences>({
    method: HttpMethod.Put,
    url: `${BASE}/channel-preferences`,
    data: { actorId, programId, mutedKinds },
  });
}
