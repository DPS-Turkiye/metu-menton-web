"use client";

import { useLocale, useTranslations } from "next-intl";

import { ChatBubble, ChatComposer } from "@/components/common/chat-thread";
import type { ProgramThreads } from "@/hooks/use-program-threads";
import {
  conversationTime,
  MAX_MESSAGE_LENGTH,
  messageTime,
} from "@/lib/coordinator-messages";
import { initials } from "@/lib/utils";

type Accent = { strong: string; soft: string };

/** The "Program" section under a Mesajlar list: one row per coordinator thread. */
export function ProgramThreadList({
  threads,
  accent,
  onSelect,
}: {
  threads: ProgramThreads;
  accent: Accent;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("programThreads");
  const locale = useLocale();
  if (!threads.threads.length) return null;
  return (
    <section aria-label={t("label")}>
      <h2 className="border-t border-[#eef0f3] px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#858c96]">
        {t("title")}
      </h2>
      <ul>
        {threads.threads.map((thread) => {
          const selected = thread.id === threads.openId;
          const unread = thread.unreadCount ?? (thread.unread ? 1 : 0);
          return (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => onSelect(thread.id)}
                style={selected ? { backgroundColor: accent.soft } : undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selected ? "" : "hover:bg-[#fafbfc]"}`}
              >
                <span
                  className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#f3f4f6] text-[10px] font-semibold"
                  style={{ color: accent.strong }}
                >
                  {initials(thread.programName ?? "") || "PR"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <b className="truncate text-[13px] font-semibold">
                      {thread.programName ?? t("title")}
                    </b>
                    <span className="shrink-0 text-[10px] text-[#858c96]">
                      {conversationTime(
                        thread.lastMessageAt,
                        new Date(),
                        locale,
                      )}
                    </span>
                  </span>
                  {thread.coordinatorName ? (
                    <span className="mt-0.5 block truncate text-[10.5px] text-[#676e78]">
                      {t("coordinator", { name: thread.coordinatorName })}
                    </span>
                  ) : null}
                  <span className="mt-1 block truncate text-[10.5px] text-[#858c96]">
                    {thread.lastMessagePreview ?? t("noMessages")}
                  </span>
                </span>
                {unread ? (
                  <span
                    className="grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: accent.strong }}
                    aria-label={t("unread", { count: unread })}
                  >
                    {unread}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The open coordinator thread: header, messages and a text-only composer. */
export function ProgramThreadPane({
  threads,
  accent,
  className = "",
}: {
  threads: ProgramThreads;
  accent: Accent;
  className?: string;
}) {
  const t = useTranslations("programThreads");
  const locale = useLocale();
  const thread = threads.active;
  if (!thread) return null;
  return (
    <section className={`flex min-h-0 flex-col bg-white ${className}`}>
      <header className="border-b border-[#e4e7ea] px-6 py-4">
        <h2 className="text-[15px] font-semibold">
          {thread.programName ?? t("title")}
        </h2>
        {thread.coordinatorName ? (
          <p className="mt-0.5 text-[12px] text-[#676e78]">
            {t("coordinator", { name: thread.coordinatorName })}
          </p>
        ) : null}
      </header>
      <div className="min-h-[240px] flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {threads.messagesLoading ? (
          <p className="text-[12px] text-[#858c96]">{t("loading")}</p>
        ) : threads.messages.length ? (
          threads.messages.map((message) => (
            <ChatBubble
              key={message.id}
              mine={message.mine}
              senderName={message.senderName}
              body={message.body}
              time={messageTime(message.createdAt, locale)}
              accent={accent}
            />
          ))
        ) : (
          <p className="text-[12px] text-[#858c96]">{t("empty")}</p>
        )}
      </div>
      {threads.sendError ? (
        <p className="px-6 text-[12px] text-red-700">{t("sendFailed")}</p>
      ) : null}
      <ChatComposer
        value={threads.draft}
        onChange={threads.setDraft}
        onSubmit={threads.send}
        canSend={threads.canSend}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder={t("placeholder")}
        inputLabel={t("inputLabel")}
        sendLabel={t("send")}
        accent={accent}
      />
    </section>
  );
}
