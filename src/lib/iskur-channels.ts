import {
  IskurChannelKind,
  type IskurChannel,
  type IskurMessage,
  type IskurMessageInput,
} from "@/interfaces/iskur-channels";
import {
  MAX_MESSAGE_LENGTH,
  messageDayLabel,
  messageTime,
} from "@/lib/coordinator-messages";

export const ISKUR_MESSAGE_MAX = MAX_MESSAGE_LENGTH;
export const ISKUR_TITLE_MAX = 160;

/** The Mesajlar list order (6.1): Duyurular, Birim, Tematik ekip, Birebir. */
export const CHANNEL_KIND_ORDER: readonly IskurChannelKind[] = [
  IskurChannelKind.Announcements,
  IskurChannelKind.Unit,
  IskurChannelKind.Team,
  IskurChannelKind.LeaderDirect,
];

export type MutableChannelKind = Exclude<
  IskurChannelKind,
  IskurChannelKind.Announcements
>;

/** The kinds a person can mute, in the order of 6.1's Bildirimler card; Genel Duyurular always notifies. */
export const MUTABLE_CHANNEL_KINDS: readonly MutableChannelKind[] = [
  IskurChannelKind.Team,
  IskurChannelKind.LeaderDirect,
  IskurChannelKind.Unit,
];

export function isMutableKind(
  kind: IskurChannelKind,
): kind is MutableChannelKind {
  return kind !== IskurChannelKind.Announcements;
}

export interface IskurChannelGroup {
  kind: IskurChannelKind;
  channels: IskurChannel[];
}

/** The list's sections, each kind once and in order; a kind with no channel is left out. */
export function groupChannels(
  channels: readonly IskurChannel[],
): IskurChannelGroup[] {
  return CHANNEL_KIND_ORDER.map((kind) => ({
    kind,
    channels: channels.filter((channel) => channel.kind === kind),
  })).filter((group) => group.channels.length > 0);
}

/** The channel a link asked for when the reader can open it, otherwise the first one. */
export function pickChannel(
  channels: readonly IskurChannel[],
  requestedId: string | null,
): IskurChannel | null {
  return (
    channels.find((channel) => channel.id === requestedId) ??
    channels[0] ??
    null
  );
}

/** "#" for a channel, "@" for a 1:1 (6.1). */
export function channelMark(kind: IskurChannelKind) {
  return kind === IskurChannelKind.LeaderDirect ? "@" : "#";
}

export enum ChannelSubtitle {
  Announcements = "announcements",
  Unit = "unit",
  Team = "team",
  WithLeader = "withLeader",
  WithMember = "withMember",
}

/** What the second line of a channel row says (5.1 Mesajlar panel). */
export function channelSubtitle(channel: IskurChannel): ChannelSubtitle {
  switch (channel.kind) {
    case IskurChannelKind.Announcements:
      return ChannelSubtitle.Announcements;
    case IskurChannelKind.Unit:
      return ChannelSubtitle.Unit;
    case IskurChannelKind.Team:
      return ChannelSubtitle.Team;
    case IskurChannelKind.LeaderDirect:
      return channel.counterpart?.leader === false
        ? ChannelSubtitle.WithMember
        : ChannelSubtitle.WithLeader;
  }
}

export enum ChannelNote {
  AnnouncementsLocked = "announcementsLocked",
  CoordinatorReadOnly = "coordinatorReadOnly",
}

/** Why the composer is missing, when it is. */
export function readOnlyNote(channel: IskurChannel): ChannelNote | null {
  if (channel.canWrite) return null;
  return channel.kind === IskurChannelKind.Announcements
    ? ChannelNote.AnnouncementsLocked
    : ChannelNote.CoordinatorReadOnly;
}

/** A coordinator posting in Genel Duyurular may give a title and mark it important. */
export function canAnnounce(channel: IskurChannel) {
  return (
    channel.kind === IskurChannelKind.Announcements &&
    channel.canWrite &&
    channel.coordinatorView
  );
}

/** A member still has to press "Okudum" on this important announcement. */
export function needsAcknowledgement(
  message: IskurMessage,
  channel: IskurChannel,
) {
  return (
    message.important &&
    message.acknowledgedAt === null &&
    !channel.coordinatorView
  );
}

export interface IskurDraft {
  body: string;
  title: string;
  important: boolean;
}

export const EMPTY_DRAFT: IskurDraft = {
  body: "",
  title: "",
  important: false,
};

/** What reaches the backend: trimmed, and a title or the important mark only where they are allowed. */
export function messageInput(
  draft: IskurDraft,
  channel: IskurChannel,
): IskurMessageInput {
  const announce = canAnnounce(channel);
  const title = draft.title.trim();
  return {
    body: draft.body.trim(),
    title: announce && title ? title : null,
    important: announce && draft.important,
  };
}

export function canSendDraft(draft: IskurDraft, channel: IskurChannel | null) {
  return Boolean(channel?.canWrite) && draft.body.trim().length > 0;
}

/** Older pages go in front; a message already shown is not repeated. */
export function withOlder(
  older: readonly IskurMessage[],
  current: readonly IskurMessage[],
): IskurMessage[] {
  const shown = new Set(current.map((message) => message.id));
  return [...older.filter((message) => !shown.has(message.id)), ...current];
}

/** The muted kinds after one toggle, kept in the Bildirimler order. */
export function toggleMuted(
  muted: readonly IskurChannelKind[],
  kind: MutableChannelKind,
  notify: boolean,
): IskurChannelKind[] {
  return MUTABLE_CHANNEL_KINDS.filter((candidate) =>
    candidate === kind ? !notify : muted.includes(candidate),
  );
}

/**
 * The team whose channels just opened (5.1 "Ekip atamanız kesinleşti"): its channel is there and the intern has not
 * opened it yet.
 */
export function newlyOpenedTeam(channels: readonly IskurChannel[]) {
  const team = channels.find(
    (channel) =>
      channel.kind === IskurChannelKind.Team && !channel.coordinatorView,
  );
  return team?.unopened ? team.name : null;
}

/** The ODTÜ red the shared chat bubbles and composer take on the İŞKUR screens. */
export const ODTU_THREAD_ACCENT = {
  strong: "var(--color-brand-odtu-strong)",
  soft: "var(--color-brand-odtu-bg)",
} as const;

/** "Bugün 09:15", "Dün 17:40", "18 Kas 10:12" (6.1). */
export function announcementTime(
  value: string,
  now = new Date(),
  locale = "tr",
) {
  return `${messageDayLabel(value, now, locale)} ${messageTime(value, locale)}`;
}

export const ISKUR_MESSAGES_HREF = "/student/messages";

/** The intern's Mesajlar with one channel open; the same link the notifications carry. */
export function channelHref(channelId: string) {
  return `${ISKUR_MESSAGES_HREF}?channel=${encodeURIComponent(channelId)}`;
}

/** A query parameter as one string: the first of repeated values, null when absent. */
export function firstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
