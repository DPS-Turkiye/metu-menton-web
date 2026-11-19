import {
  IskurChannelKind,
  type IskurChannel,
  type IskurMessage,
} from "@/interfaces/iskur-channels";

export const PROGRAM_ID = "00000000-0000-4000-8000-0000000000a1";
export const CHANNEL_ID = "00000000-0000-4000-8000-0000000000c1";
export const MESSAGE_ID = "00000000-0000-4000-8000-0000000000d1";

export function iskurChannel(
  overrides: Partial<IskurChannel> = {},
): IskurChannel {
  return {
    id: CHANNEL_ID,
    programId: PROGRAM_ID,
    programName: "İŞKUR Güz 2026",
    kind: IskurChannelKind.Team,
    name: "Medya ve Kreatif Üretim",
    unitName: "Kreatif ve Dijital Üretim",
    counterpart: null,
    memberCount: 9,
    canWrite: true,
    coordinatorView: false,
    unreadCount: 0,
    unopened: false,
    lastMessageAt: null,
    ...overrides,
  };
}

export const announcementsChannel = (overrides: Partial<IskurChannel> = {}) =>
  iskurChannel({
    id: "00000000-0000-4000-8000-0000000000c0",
    kind: IskurChannelKind.Announcements,
    name: "Genel Duyurular",
    unitName: null,
    memberCount: 76,
    canWrite: false,
    ...overrides,
  });

export function iskurMessage(
  overrides: Partial<IskurMessage> = {},
): IskurMessage {
  return {
    id: MESSAGE_ID,
    channelId: CHANNEL_ID,
    sender: { userId: "u-selin", fullName: "Selin Er", coordinator: false },
    title: null,
    body: "Bugün 14:00'te toplanalım.",
    important: false,
    createdAt: "2026-11-19T06:15:00Z",
    mine: false,
    acknowledgedAt: null,
    receipts: null,
    ...overrides,
  };
}
