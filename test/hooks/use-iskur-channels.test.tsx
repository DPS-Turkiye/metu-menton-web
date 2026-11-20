import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useIskurChannelMenu,
  useIskurMessages,
} from "@/hooks/use-iskur-channels";
import {
  IskurChannelEventType,
  IskurChannelKind,
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
  announcementsChannel,
  CHANNEL_ID,
  iskurChannel,
  iskurMessage,
  PROGRAM_ID,
} from "@test/fixtures/iskur-channels";
import { iskurStomp } from "@test/mocks/iskur-stomp";
import { createTestQueryClient } from "@test/test-utils";

vi.mock("@stomp/stompjs", async () => {
  const { iskurStomp: fake } = await import("@test/mocks/iskur-stomp");
  return { Client: fake.Client };
});
vi.mock("@/lib/client/meeting-notes", () => ({
  postRealtimeToken: vi.fn(() =>
    Promise.resolve({ token: "token", expiresAt: "2026-11-20T11:00:00Z" }),
  ),
}));

vi.mock("@/lib/client/iskur-channels", () => ({
  acknowledgeIskurMessage: vi.fn(),
  getIskurChannelPreferences: vi.fn(),
  getIskurChannels: vi.fn(),
  getIskurMessageReceipts: vi.fn(),
  getIskurMessages: vi.fn(),
  markIskurChannelRead: vi.fn(),
  postIskurMessage: vi.fn(),
  updateIskurChannelPreferences: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

const team = iskurChannel({ unreadCount: 2, unopened: true });
const announcements = announcementsChannel();

describe("useIskurMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [announcements, team],
      totalUnread: 2,
    });
    vi.mocked(getIskurMessages).mockResolvedValue({
      channel: team,
      messages: [iskurMessage()],
      hasMore: false,
    });
    vi.mocked(getIskurChannelPreferences).mockResolvedValue({
      programId: PROGRAM_ID,
      mutedKinds: [],
    });
    vi.mocked(markIskurChannelRead).mockResolvedValue(null);
  });

  it("opens the linked channel, loads it and marks it read", async () => {
    const { result } = renderHook(() => useIskurMessages(null, CHANNEL_ID), {
      wrapper,
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.active?.id).toBe(CHANNEL_ID);
    expect(result.current.groups.map((group) => group.kind)).toEqual([
      IskurChannelKind.Announcements,
      IskurChannelKind.Team,
    ]);
    expect(getIskurMessages).toHaveBeenCalledWith(CHANNEL_ID);
    await waitFor(() =>
      expect(markIskurChannelRead).toHaveBeenCalledWith(CHANNEL_ID),
    );
  });

  it("opens Genel Duyurular first and never marks a channel without unread messages", async () => {
    const { result } = renderHook(() => useIskurMessages(PROGRAM_ID, null), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.active?.kind).toBe(IskurChannelKind.Announcements),
    );
    expect(getIskurChannels).toHaveBeenCalledWith(PROGRAM_ID);
    expect(result.current.note).toBe("announcementsLocked");
    await waitFor(() => expect(getIskurMessages).toHaveBeenCalled());
    expect(markIskurChannelRead).not.toHaveBeenCalled();
  });

  it("sends the trimmed draft and clears it", async () => {
    vi.mocked(postIskurMessage).mockResolvedValue(iskurMessage({ mine: true }));
    const { result } = renderHook(() => useIskurMessages(null, CHANNEL_ID), {
      wrapper,
    });
    await waitFor(() => expect(result.current.active?.id).toBe(CHANNEL_ID));
    expect(result.current.canSend).toBe(false);

    act(() => result.current.setBody("  Merhaba  "));
    act(() => result.current.setTitle("Başlık"));
    act(() => result.current.setImportant(true));
    expect(result.current.canSend).toBe(true);
    act(() => result.current.send());

    await waitFor(() => expect(result.current.draft.body).toBe(""));
    expect(postIskurMessage).toHaveBeenCalledWith(CHANNEL_ID, {
      body: "Merhaba",
      title: null,
      important: false,
    });
  });

  it("pages back and puts the older messages in front", async () => {
    vi.mocked(getIskurMessages).mockImplementation((_id, before) =>
      Promise.resolve(
        before
          ? {
              channel: team,
              messages: [iskurMessage({ id: "old" })],
              hasMore: false,
            }
          : {
              channel: team,
              messages: [iskurMessage({ id: "new" })],
              hasMore: true,
            },
      ),
    );
    const { result } = renderHook(() => useIskurMessages(null, CHANNEL_ID), {
      wrapper,
    });
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => result.current.loadOlder());

    await waitFor(() =>
      expect(result.current.messages.map((message) => message.id)).toEqual([
        "old",
        "new",
      ]),
    );
    expect(getIskurMessages).toHaveBeenCalledWith(CHANNEL_ID, "new");
    expect(result.current.hasMore).toBe(false);
  });

  it("confirms an announcement, shows its receipts and saves a mute", async () => {
    vi.mocked(acknowledgeIskurMessage).mockResolvedValue(iskurMessage());
    vi.mocked(getIskurMessageReceipts).mockResolvedValue({
      messageId: "m1",
      read: 1,
      total: 2,
      people: [],
    });
    vi.mocked(updateIskurChannelPreferences).mockResolvedValue({
      programId: PROGRAM_ID,
      mutedKinds: [IskurChannelKind.Unit],
    });
    const { result } = renderHook(() => useIskurMessages(null, CHANNEL_ID), {
      wrapper,
    });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));

    act(() => result.current.acknowledge("m1"));
    await waitFor(() =>
      expect(acknowledgeIskurMessage).toHaveBeenCalledWith("m1"),
    );

    act(() => result.current.openReceipts("m1"));
    await waitFor(() => expect(result.current.receipts?.read).toBe(1));
    act(() => result.current.closeReceipts());
    expect(result.current.receiptsFor).toBeNull();

    act(() => result.current.setNotify(IskurChannelKind.Unit, false));
    await waitFor(() =>
      expect(result.current.muted).toEqual([IskurChannelKind.Unit]),
    );
    expect(updateIskurChannelPreferences).toHaveBeenCalledWith(PROGRAM_ID, [
      IskurChannelKind.Unit,
    ]);
  });

  it("follows a new link and lets the reader pick another channel", async () => {
    const { result, rerender } = renderHook(
      ({ link }: { link: string | null }) => useIskurMessages(null, link),
      { wrapper, initialProps: { link: null as string | null } },
    );
    await waitFor(() =>
      expect(result.current.active?.kind).toBe(IskurChannelKind.Announcements),
    );
    rerender({ link: CHANNEL_ID });
    await waitFor(() => expect(result.current.active?.id).toBe(CHANNEL_ID));
    act(() => result.current.select(announcements.id));
    expect(result.current.active?.id).toBe(announcements.id);
  });
});

describe("useIskurMessages marking read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [team],
      totalUnread: 2,
    });
    vi.mocked(getIskurMessages).mockResolvedValue({
      channel: team,
      messages: [iskurMessage()],
      hasMore: false,
    });
    vi.mocked(getIskurChannelPreferences).mockResolvedValue({
      programId: PROGRAM_ID,
      mutedKinds: [],
    });
  });

  it("tries a failed mark once per page instead of looping", async () => {
    vi.mocked(markIskurChannelRead).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useIskurMessages(null, CHANNEL_ID), {
      wrapper,
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    await waitFor(() => expect(markIskurChannelRead).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(markIskurChannelRead).toHaveBeenCalledTimes(1);
  });

  it("drops the draft when a link opens another channel", async () => {
    const { result, rerender } = renderHook(
      ({ link }: { link: string | null }) => useIskurMessages(null, link),
      { wrapper, initialProps: { link: CHANNEL_ID } },
    );
    await waitFor(() => expect(result.current.active?.id).toBe(CHANNEL_ID));
    act(() => result.current.setBody("Yarım kalan"));
    act(() => result.current.openReceipts("m1"));
    rerender({ link: announcements.id });
    expect(result.current.draft.body).toBe("");
    expect(result.current.receiptsFor).toBeNull();
  });
});

describe("useIskurMessages, live", () => {
  const topic = (channelId: string) => `/topic/iskur/channels/${channelId}`;
  const event = (type: IskurChannelEventType, channelId: string) =>
    JSON.stringify({ type, channelId, messageId: "m-9" });

  beforeEach(() => {
    vi.clearAllMocks();
    iskurStomp.reset();
    vi.mocked(getIskurChannelPreferences).mockResolvedValue({
      programId: PROGRAM_ID,
      mutedKinds: [],
    });
    vi.mocked(markIskurChannelRead).mockResolvedValue(null);
  });

  async function openLive(channels = [announcements, iskurChannel()]) {
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels,
      totalUnread: 0,
    });
    vi.mocked(getIskurMessages).mockResolvedValue({
      channel: channels[0] ?? announcements,
      messages: [iskurMessage()],
      hasMore: false,
    });
    const view = renderHook(
      () => useIskurMessages(null, channels[0]?.id ?? null),
      { wrapper },
    );
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    const client = await iskurStomp.connect();
    await waitFor(() =>
      expect(client.topics()).toEqual(
        channels.map((channel) => topic(channel.id)).sort(),
      ),
    );
    // Going live fetches once more, to catch up on what the socket missed.
    await waitFor(() => expect(getIskurChannels).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getIskurMessages).toHaveBeenCalledTimes(2));
    return { ...view, client };
  }

  it("follows every listed channel and catches up once the socket is up", async () => {
    const { client } = await openLive();

    expect(client.topics()).toHaveLength(2);
  });

  it("reloads the open channel and the unread counts when a message arrives in it", async () => {
    const { client } = await openLive();

    act(() =>
      client.deliver(
        topic(announcements.id),
        event(IskurChannelEventType.MessagePosted, announcements.id),
      ),
    );

    await waitFor(() => expect(getIskurMessages).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(getIskurChannels).toHaveBeenCalledTimes(3));
  });

  it("only refreshes the unread counts for a message in another channel", async () => {
    const { client } = await openLive();

    act(() =>
      client.deliver(
        topic(CHANNEL_ID),
        event(IskurChannelEventType.MessagePosted, CHANNEL_ID),
      ),
    );

    await waitFor(() => expect(getIskurChannels).toHaveBeenCalledTimes(3));
    expect(getIskurMessages).toHaveBeenCalledTimes(2);
  });

  it("does not reload a member's channel each time someone else confirms an announcement", async () => {
    const { client } = await openLive();

    act(() =>
      client.deliver(
        topic(announcements.id),
        event(IskurChannelEventType.MessageAcknowledged, announcements.id),
      ),
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(getIskurMessages).toHaveBeenCalledTimes(2);
    expect(getIskurChannels).toHaveBeenCalledTimes(2);
  });

  it("reloads the receipt tallies for the coordinator who posts the announcements", async () => {
    const { client } = await openLive([
      announcementsChannel({ canWrite: true, coordinatorView: true }),
    ]);

    act(() =>
      client.deliver(
        topic(announcements.id),
        event(IskurChannelEventType.MessageAcknowledged, announcements.id),
      ),
    );

    await waitFor(() => expect(getIskurMessages).toHaveBeenCalledTimes(3));
    expect(getIskurChannels).toHaveBeenCalledTimes(2);
  });

  it("fetches the list again when the broker refuses a subscription", async () => {
    const { client } = await openLive();

    act(() => client.config.onStompError?.());

    await waitFor(() => expect(getIskurChannels).toHaveBeenCalledTimes(3));
    expect(getIskurMessages).toHaveBeenCalledTimes(2);
  });

  it("keeps working on polling alone while the socket cannot open", async () => {
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [announcements],
      totalUnread: 0,
    });
    vi.mocked(getIskurMessages).mockResolvedValue({
      channel: announcements,
      messages: [iskurMessage()],
      hasMore: false,
    });
    const { result } = renderHook(() => useIskurMessages(null, null), {
      wrapper,
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => iskurStomp.last().config.onWebSocketClose?.());

    expect(result.current.messages).toHaveLength(1);
    expect(getIskurChannels).toHaveBeenCalledTimes(1);
  });
});

describe("useIskurChannelMenu", () => {
  it("counts the unread and names the team whose channels just opened", async () => {
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [announcements, team],
      totalUnread: 2,
    });
    const { result } = renderHook(() => useIskurChannelMenu(), { wrapper });
    await waitFor(() => expect(result.current.hasChannels).toBe(true));
    expect(result.current.totalUnread).toBe(2);
    expect(result.current.openedTeam).toBe("Medya ve Kreatif Üretim");
    expect(getIskurChannels).toHaveBeenCalledWith(null);
  });
});
