import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useIskurChannelMenu,
  useIskurMessages,
} from "@/hooks/use-iskur-channels";
import { IskurChannelKind } from "@/interfaces/iskur-channels";
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
import { createTestQueryClient } from "@test/test-utils";

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
