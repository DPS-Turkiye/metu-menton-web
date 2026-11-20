"use client";

import { Client, type StompSubscription } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";

import type { IskurChannelEvent } from "@/interfaces/iskur-channels";
import { postRealtimeToken } from "@/lib/client/meeting-notes";
import { getIskurChannelTopic, getRealtimeUrl } from "@/lib/const";
import { parseIskurChannelEvent } from "@/lib/iskur-channels";

/**
 * Follows the live topics of these channels over the realtime socket and hands each event to `onEvent`. `live` is
 * true while the socket is up; callers keep polling either way and only slow it down while live, so a socket that
 * cannot open (a proxy without WebSockets, a network that drops them) costs nothing but speed. The broker closes
 * the socket when it refuses a subscription (the reader lost a channel that is still in their list); `onRefused`
 * lets the caller fetch the list again, so the next connection asks only for what it may have.
 */
export function useIskurChannelPush(
  channelIds: readonly string[],
  onEvent: (event: IskurChannelEvent) => void,
  onRefused: () => void,
) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptions = useRef(new Map<string, StompSubscription>());
  const handler = useRef(onEvent);
  const refused = useRef(onRefused);
  useEffect(() => {
    handler.current = onEvent;
    refused.current = onRefused;
  });

  const enabled = channelIds.length > 0;
  const wantedKey = [...channelIds].sort().join(",");

  useEffect(() => {
    if (!enabled) return;
    const held = subscriptions.current;
    const client = new Client({
      brokerURL: getRealtimeUrl(),
      reconnectDelay: 5000,
      beforeConnect: async () => {
        try {
          const { token } = await postRealtimeToken();
          client.brokerURL = `${getRealtimeUrl()}?token=${encodeURIComponent(token)}`;
        } catch (error) {
          console.error("Realtime token could not be issued", error);
          if (isCurrent()) setConnected(false);
        }
      },
      onConnect: () => {
        if (isCurrent()) setConnected(true);
      },
      // The broker forgets a closed socket's subscriptions, so the next connection subscribes afresh.
      onWebSocketClose: () => {
        if (!isCurrent()) return;
        held.clear();
        setConnected(false);
      },
      onStompError: () => {
        if (!isCurrent()) return;
        setConnected(false);
        refused.current();
      },
    });
    // A client that was replaced still reports its own close; that must not touch its successor's state.
    const isCurrent = () => clientRef.current === client;
    clientRef.current = client;
    client.activate();
    return () => {
      clientRef.current = null;
      held.clear();
      setConnected(false);
      void client.deactivate();
    };
  }, [enabled]);

  useEffect(() => {
    const client = clientRef.current;
    if (!connected || !client?.connected) return;
    const held = subscriptions.current;
    const wanted = new Set(wantedKey ? wantedKey.split(",") : []);
    for (const [channelId, subscription] of held) {
      if (!wanted.has(channelId)) {
        subscription.unsubscribe();
        held.delete(channelId);
      }
    }
    for (const channelId of wanted) {
      if (held.has(channelId)) continue;
      held.set(
        channelId,
        client.subscribe(getIskurChannelTopic(channelId), (message) => {
          const event = parseIskurChannelEvent(message.body, channelId);
          if (event) handler.current(event);
        }),
      );
    }
  }, [connected, wantedKey]);

  return { live: enabled && connected };
}
