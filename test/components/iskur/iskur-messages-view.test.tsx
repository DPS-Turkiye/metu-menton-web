import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurMessagesView } from "@/components/iskur/iskur-messages-view";
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
import { renderWithQueryClient } from "@test/test-utils";

// The live topics have their own tests; here the screen runs on its polling alone.
vi.mock("@/hooks/use-iskur-channel-push", () => ({
  useIskurChannelPush: () => ({ live: false }),
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

const announcements = announcementsChannel();
const team = iskurChannel({ unreadCount: 3 });
const direct = iskurChannel({
  id: "00000000-0000-4000-8000-0000000000c3",
  kind: IskurChannelKind.LeaderDirect,
  name: "Zeynep Kaya",
  unitName: null,
  counterpart: { userId: "z", fullName: "Zeynep Kaya", leader: true },
});
const important = iskurMessage({
  id: "important",
  channelId: announcements.id,
  sender: { userId: "s", fullName: "Selin Er", coordinator: true },
  title: "Perşembe 19 Kasım: İş sağlığı ve güvenliği eğitimi",
  body: "Eğitim 09:00’da başlıyor.",
  important: true,
});

describe("IskurMessagesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [announcements, team, direct],
      totalUnread: 3,
    });
    vi.mocked(getIskurMessages).mockImplementation((channelId) =>
      Promise.resolve(
        channelId === announcements.id
          ? { channel: announcements, messages: [important], hasMore: false }
          : {
              channel: team,
              messages: [iskurMessage({ body: "Toplantı 14:00’te" })],
              hasMore: false,
            },
      ),
    );
    vi.mocked(getIskurChannelPreferences).mockResolvedValue({
      programId: PROGRAM_ID,
      mutedKinds: [IskurChannelKind.Unit],
    });
    vi.mocked(markIskurChannelRead).mockResolvedValue(null);
    vi.mocked(acknowledgeIskurMessage).mockResolvedValue(important);
  });

  it("lists the channels in sections and opens Genel Duyurular read-only with its Okudum", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<IskurMessagesView linkedChannelId={null} />);

    const list = await screen.findByRole("navigation", { name: "Kanallar" });
    expect(within(list).getByText("Duyurular")).toBeInTheDocument();
    expect(within(list).getByText("Tematik ekip")).toBeInTheDocument();
    expect(
      within(list).getByText("Zeynep Kaya · ekip liderin"),
    ).toBeInTheDocument();
    expect(within(list).getByText("3 okunmamış mesaj")).toBeInTheDocument();

    expect(
      await screen.findByText(
        "Perşembe 19 Kasım: İş sağlığı ve güvenliği eğitimi",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Koordinatör")).toBeInTheDocument();
    expect(screen.getByText("Önemli")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Yayın kanalı · 76 kişi · yalnızca yetkili koordinatörler paylaşır",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/yalnızca yetkili koordinatörler paylaşım yapabilir/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Mesaj" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Okudum" }));
    expect(acknowledgeIskurMessage).toHaveBeenCalledWith("important");
  });

  it("tells an intern how channels work, and leaves it out for a coordinator", async () => {
    const { unmount } = renderWithQueryClient(
      <IskurMessagesView linkedChannelId={null} />,
    );
    expect(
      await screen.findByText(
        "Kanalların, koordinatör seni bir ekibe yerleştirdiğinde açılır; ekip değişirse erişimin de güncellenir.",
      ),
    ).toBeVisible();
    unmount();

    renderWithQueryClient(
      <IskurMessagesView
        programId={PROGRAM_ID}
        linkedChannelId={null}
        framed
      />,
    );
    await screen.findAllByText(announcements.name);
    expect(screen.queryByText("Kanallar nasıl çalışır?")).toBeNull();
  });

  it("opens a team channel from the list and sends a message", async () => {
    const user = userEvent.setup();
    vi.mocked(postIskurMessage).mockResolvedValue(iskurMessage({ mine: true }));
    renderWithQueryClient(<IskurMessagesView linkedChannelId={null} />);

    await user.click(
      await screen.findByRole("button", { name: /Medya ve Kreatif Üretim/ }),
    );
    expect(await screen.findByText("Toplantı 14:00’te")).toBeInTheDocument();
    await waitFor(() =>
      expect(markIskurChannelRead).toHaveBeenCalledWith(CHANNEL_ID),
    );

    await user.type(
      screen.getByRole("textbox", { name: "Mesaj" }),
      "Geliyorum",
    );
    await user.click(screen.getByRole("button", { name: "Gönder" }));
    expect(postIskurMessage).toHaveBeenCalledWith(CHANNEL_ID, {
      body: "Geliyorum",
      title: null,
      important: false,
    });
  });

  it("keeps Genel Duyurular always on and saves the other toggles", async () => {
    const user = userEvent.setup();
    vi.mocked(updateIskurChannelPreferences).mockResolvedValue({
      programId: PROGRAM_ID,
      mutedKinds: [IskurChannelKind.Team, IskurChannelKind.Unit],
    });
    renderWithQueryClient(<IskurMessagesView linkedChannelId={null} />);

    const always = await screen.findByRole("switch", {
      name: "Önemli duyurular (kapatılamaz)",
    });
    expect(always).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: "Birim kanalı" }),
    ).toHaveAttribute("aria-checked", "false");
    await user.click(
      screen.getByRole("switch", { name: "Tematik ekip kanalı" }),
    );
    expect(updateIskurChannelPreferences).toHaveBeenCalledWith(PROGRAM_ID, [
      IskurChannelKind.Team,
      IskurChannelKind.Unit,
    ]);
  });

  it("shows a leader the Liderler odası with its unit, and its notification switch", async () => {
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [
        announcementsChannel(),
        iskurChannel({
          id: "00000000-0000-4000-8000-0000000000c9",
          kind: IskurChannelKind.Leaders,
          name: "Liderler odası",
          memberCount: 3,
        }),
        iskurChannel(),
      ],
      totalUnread: 0,
    });
    renderWithQueryClient(<IskurMessagesView linkedChannelId={null} />);

    expect(
      await screen.findByRole("switch", { name: "Liderler odası" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("heading", { name: "Liderler odası" }),
    ).toBeInTheDocument();
  });

  it("leaves the Liderler odası switch out for someone who is not in one", async () => {
    renderWithQueryClient(<IskurMessagesView linkedChannelId={null} />);
    expect(
      await screen.findByRole("switch", { name: "Birim kanalı" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Liderler odası" })).toBeNull();
  });

  it("lets a coordinator announce with a title and the important mark, and shows who read it", async () => {
    const user = userEvent.setup();
    const posting = announcementsChannel({
      canWrite: true,
      coordinatorView: true,
    });
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [posting],
      totalUnread: 0,
    });
    vi.mocked(getIskurMessages).mockResolvedValue({
      channel: posting,
      messages: [{ ...important, receipts: { read: 1, total: 2 } }],
      hasMore: false,
    });
    vi.mocked(getIskurMessageReceipts).mockResolvedValue({
      messageId: "important",
      read: 1,
      total: 2,
      people: [
        { userId: "a", fullName: "Ayşe Yıldız", readAt: null },
        { userId: "b", fullName: "Burak Tan", readAt: "2026-11-19T07:12:00Z" },
      ],
    });
    vi.mocked(postIskurMessage).mockResolvedValue(important);
    renderWithQueryClient(
      <IskurMessagesView
        programId={PROGRAM_ID}
        linkedChannelId={null}
        framed
      />,
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(await screen.findByText("İŞKUR Güz 2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Okudum" }),
    ).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: "1 / 2 kişi okudu" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Henüz okumadı")).toBeInTheDocument();
    expect(within(dialog).getByText("Burak Tan")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Kapat" }));

    await user.type(
      screen.getByRole("textbox", { name: "Duyuru başlığı" }),
      "Hatırlatma",
    );
    await user.click(screen.getByRole("checkbox", { name: /Önemli/ }));
    await user.type(
      screen.getByRole("textbox", { name: "Mesaj" }),
      "Yarın eğitim var",
    );
    await user.click(screen.getByRole("button", { name: "Gönder" }));
    expect(postIskurMessage).toHaveBeenCalledWith(posting.id, {
      body: "Yarın eğitim var",
      title: "Hatırlatma",
      important: true,
    });
  });

  it("says when the channels open and when they cannot be loaded", async () => {
    vi.mocked(getIskurChannels).mockResolvedValueOnce({
      channels: [],
      totalUnread: 0,
    });
    const { unmount } = renderWithQueryClient(
      <IskurMessagesView linkedChannelId={null} />,
    );
    expect(
      await screen.findByText(
        "Kanalların, koordinatör seni bir ekibe yerleştirdiğinde açılır.",
      ),
    ).toBeInTheDocument();
    unmount();

    vi.mocked(getIskurChannels).mockRejectedValueOnce(new Error("down"));
    renderWithQueryClient(<IskurMessagesView linkedChannelId={null} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mesajlar yüklenemedi.",
    );
  });

  it("pages back to older messages", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurMessages).mockImplementation((_id, before) =>
      Promise.resolve(
        before
          ? {
              channel: team,
              messages: [iskurMessage({ id: "old", body: "Eski mesaj" })],
              hasMore: false,
            }
          : {
              channel: team,
              messages: [iskurMessage({ id: "new", body: "Yeni mesaj" })],
              hasMore: true,
            },
      ),
    );
    renderWithQueryClient(<IskurMessagesView linkedChannelId={CHANNEL_ID} />);
    await user.click(
      await screen.findByRole("button", { name: "Daha eski mesajlar" }),
    );
    expect(await screen.findByText("Eski mesaj")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Daha eski mesajlar" }),
    ).not.toBeInTheDocument();
  });
});
