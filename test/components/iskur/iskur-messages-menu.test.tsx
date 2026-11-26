import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IskurChannelsCard,
  IskurChannelsOpenedAlert,
} from "@/components/iskur/iskur-channels-card";
import { IskurMessagesMenu } from "@/components/iskur/iskur-messages-menu";
import { getIskurChannels } from "@/lib/client/iskur-channels";
import {
  announcementsChannel,
  CHANNEL_ID,
  iskurChannel,
} from "@test/fixtures/iskur-channels";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-channels", () => ({ getIskurChannels: vi.fn() }));

describe("İŞKUR Mesajlar panel and home card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [
        announcementsChannel({ unopened: true }),
        iskurChannel({ unreadCount: 3 }),
      ],
      totalUnread: 3,
    });
  });

  it("opens the panel from the header, marks new channels and links to them", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<IskurMessagesMenu />);

    await user.click(
      await screen.findByRole("button", { name: "Mesajlar, 3 okunmamış" }),
    );
    const panel = screen.getByRole("region", { name: "Mesajlar" });
    expect(screen.getByRole("link", { name: /Genel Duyurular/ })).toHaveFocus();
    expect(panel).toHaveTextContent("Yeni");
    expect(
      screen.getByRole("link", { name: /Medya ve Kreatif Üretim/ }),
    ).toHaveAttribute("href", `/student/messages?channel=${CHANNEL_ID}`);
    expect(
      screen.getByRole("link", { name: "Tüm mesajları aç →" }),
    ).toHaveAttribute("href", "/student/messages");
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("region", { name: "Mesajlar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mesajlar, 3 okunmamış" }),
    ).toHaveFocus();
  });

  it("shows nothing to a student without İŞKUR channels", async () => {
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [],
      totalUnread: 0,
    });
    renderWithQueryClient(
      <>
        <IskurMessagesMenu />
        <IskurChannelsCard />
        <IskurChannelsOpenedAlert />
      </>,
    );
    await vi.waitFor(() => expect(getIskurChannels).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: /Mesajlar/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Ekibim" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Kanalların açıldı/)).not.toBeInTheDocument();
  });

  it("lists the channels on the home card and announces a newly finalized team", async () => {
    vi.mocked(getIskurChannels).mockResolvedValue({
      channels: [
        announcementsChannel(),
        iskurChannel({ unopened: true, unreadCount: 2 }),
      ],
      totalUnread: 2,
    });
    renderWithQueryClient(
      <>
        <IskurChannelsOpenedAlert />
        <IskurChannelsCard />
      </>,
    );
    expect(
      await screen.findByText("Kanalların açıldı: Medya ve Kreatif Üretim"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 kanal otomatik oluşturuldu/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ekibim" })).toBeInTheDocument();
    expect(screen.getByText("2 okunmamış mesaj")).toBeInTheDocument();
  });
});
