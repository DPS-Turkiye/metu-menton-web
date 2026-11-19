"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type {
  IskurChannelPreferences,
  IskurMessage,
  IskurMessageInput,
} from "@/interfaces/iskur-channels";
import {
  acknowledgeIskurMessage,
  getIskurChannelPreferences,
  getIskurChannels,
  getIskurMessageReceipts,
  getIskurMessages,
  markIskurChannelRead,
  postIskurMessage,
  updateIskurChannelPreferences,
} from "@/lib/client/iskur-channels";
import {
  canAnnounce,
  canSendDraft,
  EMPTY_DRAFT,
  groupChannels,
  ISKUR_MESSAGE_MAX,
  ISKUR_TITLE_MAX,
  messageInput,
  newlyOpenedTeam,
  pickChannel,
  readOnlyNote,
  toggleMuted,
  withOlder,
  type IskurDraft,
  type MutableChannelKind,
} from "@/lib/iskur-channels";
import { POLL_INTERVAL, polling } from "@/lib/poll";

export const ISKUR_CHANNELS_QUERY_KEY = ["iskur-channels"] as const;

export const iskurChannelListQueryKey = (programId: string | null) =>
  [...ISKUR_CHANNELS_QUERY_KEY, "list", programId] as const;

export const iskurMessagesQueryKey = (channelId: string | null) =>
  [...ISKUR_CHANNELS_QUERY_KEY, "messages", channelId] as const;

const preferencesQueryKey = (programId: string | null) =>
  [...ISKUR_CHANNELS_QUERY_KEY, "preferences", programId] as const;

const receiptsQueryKey = (messageId: string | null) =>
  [...ISKUR_CHANNELS_QUERY_KEY, "receipts", messageId] as const;

/** The intern's channels for the header's Mesajlar panel and the home card (5.1); polled in the background. */
export function useIskurChannelMenu() {
  const list = useQuery({
    queryKey: iskurChannelListQueryKey(null),
    queryFn: () => getIskurChannels(null),
    ...polling(POLL_INTERVAL.messages),
  });
  const channels = list.data?.channels ?? [];
  return {
    channels,
    totalUnread: list.data?.totalUnread ?? 0,
    hasChannels: channels.length > 0,
    openedTeam: newlyOpenedTeam(channels),
  };
}

/**
 * The Mesajlar screen (6.1): the channel list, the open channel with its older pages, the composer, "Okudum", the
 * coordinators' receipts and the Bildirimler toggles. `programId` narrows a coordinator to one program;
 * `linkedChannelId` is the channel a notification links to (`?channel=`).
 */
export function useIskurMessages(
  programId: string | null,
  linkedChannelId: string | null,
) {
  const queryClient = useQueryClient();
  const [requestedId, setRequestedId] = useState(linkedChannelId);
  const [syncedLink, setSyncedLink] = useState(linkedChannelId);
  const [draft, setDraft] = useState<IskurDraft>(EMPTY_DRAFT);
  const [older, setOlder] = useState<{
    channelId: string;
    messages: IskurMessage[];
    hasMore: boolean;
  } | null>(null);
  const [receiptsFor, setReceiptsFor] = useState<string | null>(null);
  // Switching channels starts clean: no half-written draft for the wrong channel, no other channel's receipts.
  const openChannel = (channelId: string | null) => {
    setRequestedId(channelId);
    setDraft(EMPTY_DRAFT);
    setReceiptsFor(null);
    setOlder(null);
  };
  if (syncedLink !== linkedChannelId) {
    setSyncedLink(linkedChannelId);
    openChannel(linkedChannelId);
  }

  const list = useQuery({
    queryKey: iskurChannelListQueryKey(programId),
    queryFn: () => getIskurChannels(programId),
    ...polling(POLL_INTERVAL.messages),
  });
  const channels = list.data?.channels ?? [];
  const active = pickChannel(channels, requestedId);
  const activeId = active?.id ?? null;

  const page = useQuery({
    queryKey: iskurMessagesQueryKey(activeId),
    queryFn: () => getIskurMessages(activeId ?? ""),
    enabled: Boolean(activeId),
    ...polling(POLL_INTERVAL.chat),
  });

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: ISKUR_CHANNELS_QUERY_KEY });

  const markRead = useMutation({
    mutationFn: (channelId: string) => markIskurChannelRead(channelId),
    // Only the lists' counts change; refetching the open page would only mark it again.
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: [...ISKUR_CHANNELS_QUERY_KEY, "list"],
      }),
  });
  // A channel with something unread is marked read once per page of messages actually on a visible screen; a
  // failed mark waits for the next page rather than retrying in a loop.
  const unread = active?.unreadCount ?? 0;
  const { mutate: markChannelRead } = markRead;
  const markedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeId || unread === 0 || !page.dataUpdatedAt) return;
    if (document.visibilityState !== "visible") return;
    const key = `${activeId}:${page.dataUpdatedAt}`;
    if (markedFor.current === key) return;
    markedFor.current = key;
    markChannelRead(activeId);
  }, [activeId, unread, page.dataUpdatedAt, markChannelRead]);

  const loadOlder = useMutation({
    mutationFn: ({
      channelId,
      before,
    }: {
      channelId: string;
      before: string;
    }) => getIskurMessages(channelId, before),
    onSuccess: (result, { channelId }) =>
      setOlder((previous) => ({
        channelId,
        messages: withOlder(
          result.messages,
          previous?.channelId === channelId ? previous.messages : [],
        ),
        hasMore: result.hasMore,
      })),
  });

  const send = useMutation({
    mutationFn: (variables: { channelId: string; input: IskurMessageInput }) =>
      postIskurMessage(variables.channelId, variables.input),
    onSuccess: (_message, { channelId }) => {
      setDraft(EMPTY_DRAFT);
      void queryClient.invalidateQueries({
        queryKey: iskurMessagesQueryKey(channelId),
      });
      void refreshList();
    },
  });

  const acknowledge = useMutation({
    mutationFn: (variables: { messageId: string; channelId: string }) =>
      acknowledgeIskurMessage(variables.messageId),
    onSuccess: (_message, { channelId }) =>
      void queryClient.invalidateQueries({
        queryKey: iskurMessagesQueryKey(channelId),
      }),
  });

  const receipts = useQuery({
    queryKey: receiptsQueryKey(receiptsFor),
    queryFn: () => getIskurMessageReceipts(receiptsFor ?? ""),
    enabled: Boolean(receiptsFor),
  });

  const preferencesProgram = active?.programId ?? programId;
  const preferences = useQuery({
    queryKey: preferencesQueryKey(preferencesProgram),
    queryFn: () => getIskurChannelPreferences(preferencesProgram ?? ""),
    enabled: Boolean(preferencesProgram),
  });
  const savePreferences = useMutation({
    mutationFn: (variables: {
      programId: string;
      mutedKinds: MutableChannelKind[];
    }) =>
      updateIskurChannelPreferences(variables.programId, variables.mutedKinds),
    onSuccess: (saved: IskurChannelPreferences) =>
      queryClient.setQueryData(preferencesQueryKey(saved.programId), saved),
  });
  const muted = preferences.data?.mutedKinds ?? [];

  const current = page.data?.messages ?? [];
  const earlier = older?.channelId === activeId ? older : null;
  const messages = earlier ? withOlder(earlier.messages, current) : current;
  const hasMore = earlier ? earlier.hasMore : (page.data?.hasMore ?? false);
  const oldest = messages[0] ?? null;

  return {
    groups: groupChannels(channels),
    isLoading: list.isLoading,
    error: list.error,
    active,
    select: openChannel,
    messages,
    messagesLoading: page.isLoading,
    hasMore,
    loadingOlder: loadOlder.isPending,
    loadOlder: () => {
      if (activeId && oldest) {
        loadOlder.mutate({ channelId: activeId, before: oldest.id });
      }
    },
    note: active ? readOnlyNote(active) : null,
    announce: active ? canAnnounce(active) : false,
    draft,
    setBody: (body: string) =>
      setDraft((previous) => ({
        ...previous,
        body: body.slice(0, ISKUR_MESSAGE_MAX),
      })),
    setTitle: (title: string) =>
      setDraft((previous) => ({
        ...previous,
        title: title.slice(0, ISKUR_TITLE_MAX),
      })),
    setImportant: (important: boolean) =>
      setDraft((previous) => ({ ...previous, important })),
    canSend: canSendDraft(draft, active) && !send.isPending,
    send: () => {
      if (active && canSendDraft(draft, active)) {
        send.mutate({
          channelId: active.id,
          input: messageInput(draft, active),
        });
      }
    },
    sendError: send.error,
    acknowledge: (messageId: string) => {
      if (activeId) acknowledge.mutate({ messageId, channelId: activeId });
    },
    acknowledging: acknowledge.isPending
      ? acknowledge.variables.messageId
      : null,
    receiptsFor,
    openReceipts: (messageId: string) => setReceiptsFor(messageId),
    closeReceipts: () => setReceiptsFor(null),
    receipts: receipts.data ?? null,
    receiptsLoading: receipts.isLoading,
    muted,
    preferencesReady: Boolean(preferences.data),
    setNotify: (kind: MutableChannelKind, notify: boolean) => {
      if (preferencesProgram) {
        savePreferences.mutate({
          programId: preferencesProgram,
          mutedKinds: toggleMuted(muted, kind, notify),
        });
      }
    },
    savingPreferences: savePreferences.isPending,
  };
}

export type IskurMessagesScreen = ReturnType<typeof useIskurMessages>;
