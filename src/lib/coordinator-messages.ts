import type { useTranslations } from "next-intl";

import {
  CoordinatorConversationCounterpart,
  type CoordinatorConversation,
} from "@/interfaces/coordinator-conversation";
import {
  CoordinatorMentorshipHealth,
  type CoordinatorMentorship,
} from "@/interfaces/coordinator-mentorship";
import { shortWeekday } from "@/lib/calendar";
import { formatTurkishTime, turkishDaysBetween } from "@/lib/turkey-time";
import { formatDayMonth, relativeDayLabel } from "@/lib/utils";

export enum MessageFilter {
  All = "ALL",
  Mentors = "MENTORS",
  Teams = "TEAMS",
  Announcements = "ANNOUNCEMENTS",
}

type MessagesT = ReturnType<typeof useTranslations<"coordinatorMessages">>;

const COUNTERPART_OF_FILTER: Record<
  Exclude<MessageFilter, MessageFilter.All | MessageFilter.Announcements>,
  CoordinatorConversationCounterpart
> = {
  [MessageFilter.Mentors]: CoordinatorConversationCounterpart.Mentor,
  [MessageFilter.Teams]: CoordinatorConversationCounterpart.Team,
};

/** The open thread counts as read: the backend marks it when its messages load. */
export function isUnread(
  conversation: CoordinatorConversation,
  openId: string | null,
) {
  return conversation.unread && conversation.id !== openId;
}

/** "Tümü · Mentorlar 1 · Takımlar 2", counting unread threads. */
export function messageFilterOptions(
  conversations: CoordinatorConversation[],
  openId: string | null,
  t: MessagesT,
) {
  const unread = (type: CoordinatorConversationCounterpart) =>
    conversations.filter(
      (item) => item.counterpartType === type && isUnread(item, openId),
    ).length;
  return [
    { id: MessageFilter.All, label: t("filters.ALL") },
    {
      id: MessageFilter.Mentors,
      label: t("filters.MENTORS", {
        count: unread(CoordinatorConversationCounterpart.Mentor),
      }),
    },
    {
      id: MessageFilter.Teams,
      label: t("filters.TEAMS", {
        count: unread(CoordinatorConversationCounterpart.Team),
      }),
    },
    { id: MessageFilter.Announcements, label: t("filters.ANNOUNCEMENTS") },
  ];
}

export function filterConversations(
  conversations: CoordinatorConversation[],
  {
    filter,
    search,
    programId,
  }: { filter: MessageFilter; search: string; programId: string | null },
) {
  if (filter === MessageFilter.Announcements) return [];
  const needle = search.trim().toLocaleLowerCase("tr");
  return conversations.filter(
    (item) =>
      (filter === MessageFilter.All ||
        item.counterpartType === COUNTERPART_OF_FILTER[filter]) &&
      (!programId || item.programId === programId) &&
      (!needle ||
        [item.counterpartName, item.programName, item.lastMessagePreview ?? ""]
          .join(" ")
          .toLocaleLowerCase("tr")
          .includes(needle)),
  );
}

/** The table rows the counterpart takes part in, within the thread's program. */
export function relatedMentorships(
  conversation: CoordinatorConversation,
  mentorships: CoordinatorMentorship[],
) {
  return mentorships.filter(
    (row) =>
      row.programId === conversation.programId &&
      (conversation.counterpartType ===
      CoordinatorConversationCounterpart.Mentor
        ? row.mentorId === conversation.counterpartId
        : row.organizationId === conversation.counterpartId),
  );
}

/** The person whose photo a thread shows: its mentor; a team thread names an organization, which has none. */
export function counterpartPersonId(
  conversation: Pick<
    CoordinatorConversation,
    "counterpartType" | "counterpartId"
  >,
) {
  return conversation.counterpartType ===
    CoordinatorConversationCounterpart.Mentor
    ? conversation.counterpartId
    : null;
}

/** "Mentor · Lumen, Kavun" or "Takım · Ayşe Demir". */
export function counterpartSubtitle(
  conversation: CoordinatorConversation,
  related: CoordinatorMentorship[],
  t: MessagesT,
) {
  const names = related.map((row) =>
    conversation.counterpartType === CoordinatorConversationCounterpart.Mentor
      ? row.organizationName
      : row.mentorName,
  );
  const label = t(`counterpart.${conversation.counterpartType}`);
  return names.length > 0 ? `${label} · ${names.join(", ")}` : label;
}

/** "3 okunmamış mesaj · 1 konuşma riskli bir mentorlukla ilgili". */
export function messagesSubtitle(
  conversations: CoordinatorConversation[],
  mentorships: CoordinatorMentorship[],
  openId: string | null,
  t: MessagesT,
) {
  const unread = conversations.filter((item) => isUnread(item, openId)).length;
  const risky = conversations.filter((item) =>
    relatedMentorships(item, mentorships).some(
      (row) => row.health === CoordinatorMentorshipHealth.Risky,
    ),
  ).length;
  const parts = [t("unreadCount", { count: unread })];
  if (risky > 0) parts.push(t("riskyCount", { count: risky }));
  return parts.join(" · ");
}

/** "10:24" today, "Dün", "Pzt" within the week, then "12 Eyl". */
export function conversationTime(
  value: string | null,
  now = new Date(),
  locale = "tr",
) {
  if (!value) return "";
  const days = turkishDaysBetween(value, now);
  if (days <= 0) return formatTurkishTime(value, locale);
  if (days === 1) return relativeDayLabel(-1, locale);
  if (days < 7) return shortWeekday(value, locale).replace(".", "");
  return formatDayMonth(value, locale);
}

/** The separator above a day's messages: "Bugün", "Dün" or "12 Eyl". */
export function messageDayLabel(
  value: string,
  now = new Date(),
  locale = "tr",
) {
  const days = turkishDaysBetween(value, now);
  if (days <= 0) return relativeDayLabel(0, locale);
  if (days === 1) return relativeDayLabel(-1, locale);
  return formatDayMonth(value, locale);
}

export function messageTime(value: string, locale = "tr") {
  return formatTurkishTime(value, locale);
}

export const MAX_MESSAGE_LENGTH = 4000;
