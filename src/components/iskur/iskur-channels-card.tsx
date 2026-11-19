"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Card } from "@/components/ia/card";
import { useIskurChannelMenu } from "@/hooks/use-iskur-channels";
import { channelHref, channelMark } from "@/lib/iskur-channels";

/** 5.1 "Ekip atamanız kesinleşti": shown until the intern first opens their new team channel. */
export function IskurChannelsOpenedAlert() {
  const t = useTranslations("iskurChannels.opened");
  const { openedTeam, channels } = useIskurChannelMenu();
  if (!openedTeam) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-status-success-border bg-status-success-bg px-4 py-3"
    >
      <CheckCircle2
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-status-success-icon"
      />
      <div>
        <p className="type-label text-status-success-text">
          {t("title", { team: openedTeam })}
        </p>
        <p className="type-body-sm text-text-primary">
          {t("body", { count: channels.length })}
        </p>
      </div>
    </div>
  );
}

/** The intern's channels with their unread counts, on the home side column (5.1 "Ekibim" card's channel rows). */
export function IskurChannelsCard() {
  const t = useTranslations("iskurChannels");
  const { channels, hasChannels } = useIskurChannelMenu();
  if (!hasChannels) return null;
  return (
    <Card labelledBy="iskur-channels-card">
      <h2
        id="iskur-channels-card"
        className="type-title-card text-text-primary"
      >
        {t("card.title")}
      </h2>
      <ul className="mt-3">
        {channels.map((channel) => (
          <li key={channel.id}>
            <Link
              href={channelHref(channel.id)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 type-label hover:bg-background-subtle"
            >
              <span aria-hidden className="text-text-muted">
                {channelMark(channel.kind)}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {channel.name}
              </span>
              {channel.unreadCount > 0 ? (
                <span
                  aria-label={t("unread", { count: channel.unreadCount })}
                  className="grid size-6 place-items-center rounded-full bg-brand-mentor-bg type-label-sm text-brand-mentor-strong"
                >
                  {channel.unreadCount}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
