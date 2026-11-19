/** The İŞKUR channels of rules frame 322:3413 §4, in the order the Mesajlar list shows them. */
export enum IskurChannelKind {
  Announcements = "ANNOUNCEMENTS",
  Unit = "UNIT",
  Team = "TEAM",
  LeaderDirect = "LEADER_DIRECT",
}

export interface IskurChannelCounterpart {
  userId: string;
  fullName: string;
  /** True when the other side is the reader's team leader. */
  leader: boolean;
}

export interface IskurChannel {
  id: string;
  programId: string;
  programName: string;
  kind: IskurChannelKind;
  name: string;
  /** The unit a team channel belongs to. */
  unitName: string | null;
  counterpart: IskurChannelCounterpart | null;
  memberCount: number;
  canWrite: boolean;
  /** Reached through a coordinator's or the admin's role, not as a member. */
  coordinatorView: boolean;
  unreadCount: number;
  /** Never opened yet (5.1 "Yeni"). */
  unopened: boolean;
  lastMessageAt: string | null;
}

export interface IskurChannelList {
  channels: IskurChannel[];
  totalUnread: number;
}

export interface IskurMessageSender {
  userId: string;
  fullName: string;
  coordinator: boolean;
}

export interface IskurMessage {
  id: string;
  channelId: string;
  sender: IskurMessageSender | null;
  title: string | null;
  body: string;
  important: boolean;
  createdAt: string;
  mine: boolean;
  /** When the reader confirmed an important announcement ("Okudum"). */
  acknowledgedAt: string | null;
  /** How many confirmed it; only for the coordinators who post in the channel. */
  receipts: { read: number; total: number } | null;
}

export interface IskurMessagePage {
  channel: IskurChannel;
  messages: IskurMessage[];
  hasMore: boolean;
}

export interface IskurMessageReader {
  userId: string;
  fullName: string;
  readAt: string | null;
}

export interface IskurMessageReceipts {
  messageId: string;
  read: number;
  total: number;
  people: IskurMessageReader[];
}

export interface IskurChannelPreferences {
  programId: string;
  mutedKinds: IskurChannelKind[];
}

export interface IskurMessageInput {
  body: string;
  title: string | null;
  important: boolean;
}
