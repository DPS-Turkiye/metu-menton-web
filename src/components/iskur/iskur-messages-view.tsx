"use client";

import { useLocale, useTranslations } from "next-intl";

import { ChatBubble, ChatComposer } from "@/components/common/chat-thread";
import { ModalDialog } from "@/components/common/modal-dialog";
import { ToggleSwitch } from "@/components/common/toggle-switch";
import {
  useIskurMessages,
  type IskurMessagesScreen,
} from "@/hooks/use-iskur-channels";
import {
  IskurChannelKind,
  type IskurChannel,
  type IskurMessage,
} from "@/interfaces/iskur-channels";
import {
  announcementTime,
  channelMark,
  channelSubtitle,
  ISKUR_MESSAGE_MAX,
  ISKUR_TITLE_MAX,
  MUTABLE_CHANNEL_KINDS,
  needsAcknowledgement,
  ODTU_THREAD_ACCENT,
} from "@/lib/iskur-channels";
import { initials } from "@/lib/utils";

/** 6.1 Mesajlar: the intern's (or a coordinator's) channels, the open one, and the notification toggles. */
export function IskurMessagesView({
  programId = null,
  linkedChannelId,
  framed = false,
}: {
  programId?: string | null;
  linkedChannelId: string | null;
  /** Inside a coordinator's program frame, which brings its own padding and title. */
  framed?: boolean;
}) {
  const t = useTranslations("iskurChannels");
  const screen = useIskurMessages(programId, linkedChannelId);
  const empty = !screen.isLoading && screen.groups.length === 0;

  return (
    <div
      className={
        framed
          ? "w-full"
          : "mx-auto w-full max-w-[1440px] px-4 pb-16 pt-8 sm:px-8 lg:px-20"
      }
    >
      {framed ? null : (
        <h1 className="type-h1 text-text-primary">{t("title")}</h1>
      )}
      {screen.error ? (
        <p role="alert" className="mt-6 type-body-sm text-status-error-text">
          {t("loadFailed")}
        </p>
      ) : null}
      {screen.isLoading ? (
        <p className="mt-6 type-body-sm text-text-muted">{t("loading")}</p>
      ) : null}
      {empty ? (
        <p className="mt-6 rounded-2xl border border-border-subtle bg-background-surface p-6 type-body-sm text-text-secondary">
          {t("noChannels")}
        </p>
      ) : null}
      {screen.groups.length > 0 ? (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
          <ChannelList screen={screen} />
          {screen.active ? (
            <ChannelPane screen={screen} channel={screen.active} />
          ) : null}
          <NotificationCard screen={screen} />
        </div>
      ) : null}
      <ReceiptsDialog screen={screen} />
    </div>
  );
}

function ChannelList({ screen }: { screen: IskurMessagesScreen }) {
  const t = useTranslations("iskurChannels");
  return (
    <nav
      aria-label={t("listLabel")}
      className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-background-surface p-3"
    >
      {screen.groups.map((group) => (
        <section key={group.kind} aria-label={t(`group.${group.kind}`)}>
          <h2 className="px-3 pb-1 pt-2.5 type-overline text-text-muted">
            {t(`group.${group.kind}`)}
          </h2>
          <ul>
            {group.channels.map((channel) => {
              const selected = channel.id === screen.active?.id;
              return (
                <li key={channel.id}>
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => screen.select(channel.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left type-label ${selected ? "bg-brand-odtu-bg" : "hover:bg-background-subtle"}`}
                  >
                    <span aria-hidden className="text-text-muted">
                      {channelMark(channel.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-text-primary">
                        {channel.kind === IskurChannelKind.LeaderDirect &&
                        channel.counterpart?.leader
                          ? t("withYourLeader", { name: channel.name })
                          : channel.name}
                      </span>
                      {channel.coordinatorView ? (
                        <span className="block truncate type-caption text-text-muted">
                          {channel.programName}
                        </span>
                      ) : null}
                    </span>
                    {channel.unreadCount > 0 ? (
                      <span
                        aria-label={t("unread", { count: channel.unreadCount })}
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-mentor-bg type-label-sm text-brand-mentor-strong"
                      >
                        {channel.unreadCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function ChannelPane({
  screen,
  channel,
}: {
  screen: IskurMessagesScreen;
  channel: IskurChannel;
}) {
  const t = useTranslations("iskurChannels");
  const locale = useLocale();
  const announcements = channel.kind === IskurChannelKind.Announcements;
  return (
    <section
      aria-label={channel.name}
      className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-background-surface"
    >
      <header className="border-b border-border-subtle px-6 py-4">
        <h2 className="type-h4 text-text-primary">{channel.name}</h2>
        <p className="type-caption text-text-muted">
          {t(`subtitle.${channelSubtitle(channel)}`, {
            count: channel.memberCount,
            unit: channel.unitName ?? "",
          })}
        </p>
      </header>
      <div
        className={`flex-1 overflow-y-auto ${announcements ? "" : "space-y-4 px-6 py-5"}`}
      >
        {screen.hasMore ? (
          <div className="flex justify-center px-6 py-3">
            <button
              type="button"
              onClick={screen.loadOlder}
              disabled={screen.loadingOlder}
              className="type-label-sm text-text-link disabled:opacity-50"
            >
              {t("older")}
            </button>
          </div>
        ) : null}
        {screen.messagesLoading ? (
          <p className="px-6 py-5 type-body-sm text-text-muted">
            {t("loading")}
          </p>
        ) : screen.messages.length === 0 ? (
          <p className="px-6 py-5 type-body-sm text-text-muted">{t("empty")}</p>
        ) : announcements ? (
          screen.messages.map((message) => (
            <Announcement
              key={message.id}
              screen={screen}
              channel={channel}
              message={message}
            />
          ))
        ) : (
          screen.messages.map((message) => (
            <ChatBubble
              key={message.id}
              mine={message.mine}
              senderName={message.sender?.fullName ?? t("formerMember")}
              senderTag={
                message.sender?.coordinator ? (
                  <span className="rounded-full bg-status-neutral-bg px-2 text-status-neutral-text">
                    {t("coordinatorTag")}
                  </span>
                ) : null
              }
              body={message.body}
              time={announcementTime(message.createdAt, new Date(), locale)}
              accent={ODTU_THREAD_ACCENT}
            />
          ))
        )}
      </div>
      {screen.note ? (
        <p className="bg-background-subtle px-6 py-4 type-caption text-text-secondary">
          {t(`note.${screen.note}`)}
        </p>
      ) : null}
      {screen.sendError ? (
        <p
          role="alert"
          className="px-6 pt-3 type-caption text-status-error-text"
        >
          {t("sendFailed")}
        </p>
      ) : null}
      {channel.canWrite ? (
        <>
          {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
          <ChatComposer
            value={screen.draft.body}
            onChange={screen.setBody}
            onSubmit={screen.send}
            canSend={screen.canSend}
            maxLength={ISKUR_MESSAGE_MAX}
            placeholder={t("placeholder")}
            inputLabel={t("inputLabel")}
            sendLabel={t("send")}
            accent={ODTU_THREAD_ACCENT}
          >
            {screen.announce ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={screen.draft.title}
                  onChange={(event) => screen.setTitle(event.target.value)}
                  maxLength={ISKUR_TITLE_MAX}
                  placeholder={t("titlePlaceholder")}
                  aria-label={t("titleLabel")}
                  className="h-9 min-w-0 flex-1 rounded-full bg-background-subtle px-4 type-body-sm outline-none"
                />
                <label className="flex items-center gap-2 type-body-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={screen.draft.important}
                    onChange={(event) =>
                      screen.setImportant(event.target.checked)
                    }
                  />
                  {t("markImportant")}
                </label>
              </div>
            ) : null}
          </ChatComposer>
        </>
      ) : null}
    </section>
  );
}

function Announcement({
  screen,
  channel,
  message,
}: {
  screen: IskurMessagesScreen;
  channel: IskurChannel;
  message: IskurMessage;
}) {
  const t = useTranslations("iskurChannels");
  const locale = useLocale();
  const senderName = message.sender?.fullName ?? t("formerMember");
  const asking = needsAcknowledgement(message, channel);
  return (
    <article
      className={`flex flex-col gap-2.5 border-b border-border-subtle px-6 py-5 ${message.important ? "bg-status-warning-bg" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-background-selected type-label-sm text-text-accent"
        >
          {initials(senderName)}
        </span>
        <span className="type-label text-text-primary">{senderName}</span>
        {message.sender?.coordinator ? (
          <span className="rounded-full bg-status-neutral-bg px-3 py-1.5 type-label-sm text-status-neutral-text">
            {t("coordinatorTag")}
          </span>
        ) : null}
        {message.important ? (
          <span className="rounded-full bg-status-error-bg px-3 py-1.5 type-label-sm text-status-error-text">
            {t("importantTag")}
          </span>
        ) : null}
        <time className="flex-1 text-right type-caption text-text-muted">
          {announcementTime(message.createdAt, new Date(), locale)}
        </time>
      </div>
      {message.title ? (
        <h3 className="type-title-card text-text-primary">{message.title}</h3>
      ) : null}
      <p className="whitespace-pre-wrap type-body-sm text-text-primary">
        {message.body}
      </p>
      {asking ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => screen.acknowledge(message.id)}
            disabled={screen.acknowledging === message.id}
            className="h-9 rounded-xl bg-action-primary-bg px-3 type-button-sm text-action-primary-fg disabled:opacity-50"
          >
            {t("acknowledge")}
          </button>
          <span className="type-caption text-status-warning-text">
            {t("acknowledgeAsked")}
          </span>
        </div>
      ) : null}
      {message.important && message.acknowledgedAt ? (
        <p className="type-caption text-status-success-text">
          {t("acknowledged", {
            time: announcementTime(message.acknowledgedAt, new Date(), locale),
          })}
        </p>
      ) : null}
      {message.receipts ? (
        <button
          type="button"
          onClick={() => screen.openReceipts(message.id)}
          className="self-start type-label-sm text-text-link"
        >
          {t("receiptsCount", {
            read: message.receipts.read,
            total: message.receipts.total,
          })}
        </button>
      ) : null}
    </article>
  );
}

function NotificationCard({ screen }: { screen: IskurMessagesScreen }) {
  const t = useTranslations("iskurChannels");
  if (!screen.preferencesReady) return null;
  return (
    <section
      aria-label={t("notifications.title")}
      className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-surface p-6 lg:col-start-2 xl:col-start-auto"
    >
      <h2 className="type-title-card text-text-primary">
        {t("notifications.title")}
      </h2>
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked
          disabled
          label={t("notifications.important")}
          onChange={() => undefined}
        />
        <span className="type-body text-text-disabled">
          {t("notifications.important")}
        </span>
      </div>
      {MUTABLE_CHANNEL_KINDS.map((kind) => {
        const on = !screen.muted.includes(kind);
        return (
          <div key={kind} className="flex items-center gap-3">
            <ToggleSwitch
              checked={on}
              disabled={screen.savingPreferences}
              label={t(`notifications.${kind}`)}
              onChange={() => screen.setNotify(kind, !on)}
            />
            <span className="type-body text-text-primary">
              {t(`notifications.${kind}`)}
            </span>
          </div>
        );
      })}
      <p className="type-caption text-text-muted">{t("notifications.hint")}</p>
    </section>
  );
}

function ReceiptsDialog({ screen }: { screen: IskurMessagesScreen }) {
  const t = useTranslations("iskurChannels");
  const locale = useLocale();
  if (!screen.receiptsFor) return null;
  return (
    <ModalDialog
      labelledBy="iskur-receipts-title"
      onClose={screen.closeReceipts}
    >
      {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
      <div className="w-[min(92vw,420px)] rounded-2xl bg-background-surface p-6">
        <h2 id="iskur-receipts-title" className="type-h4 text-text-primary">
          {t("receipts.title")}
        </h2>
        {screen.receiptsLoading || !screen.receipts ? (
          <p className="mt-3 type-body-sm text-text-muted">{t("loading")}</p>
        ) : (
          <>
            <p className="mt-1 type-caption text-text-muted">
              {t("receiptsCount", {
                read: screen.receipts.read,
                total: screen.receipts.total,
              })}
            </p>
            <ul className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
              {screen.receipts.people.map((reader) => (
                <li
                  key={reader.userId}
                  className="flex items-center justify-between gap-3 type-body-sm"
                >
                  <span className="text-text-primary">{reader.fullName}</span>
                  <span
                    className={
                      reader.readAt
                        ? "text-status-success-text"
                        : "text-text-muted"
                    }
                  >
                    {reader.readAt
                      ? announcementTime(reader.readAt, new Date(), locale)
                      : t("receipts.notYet")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          onClick={screen.closeReceipts}
          className="mt-5 h-9 rounded-xl border border-border-default px-3 type-button-sm text-text-primary"
        >
          {t("receipts.close")}
        </button>
      </div>
    </ModalDialog>
  );
}
