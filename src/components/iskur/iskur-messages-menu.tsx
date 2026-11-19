"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useIskurChannelMenu } from "@/hooks/use-iskur-channels";
import {
  channelHref,
  channelMark,
  channelSubtitle,
  ISKUR_MESSAGES_HREF,
} from "@/lib/iskur-channels";

/** The header's Mesajlar icon and panel (5.1); shown only to someone with İŞKUR channels. */
export function IskurMessagesMenu() {
  const t = useTranslations("iskurChannels");
  const menu = useIskurChannelMenu();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!menu.hasChannels) return null;
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          menu.totalUnread > 0
            ? t("menu.labelUnread", { count: menu.totalUnread })
            : t("menu.label")
        }
        ref={buttonRef}
        aria-expanded={open}
        aria-controls="iskur-messages-panel"
        onClick={() => setOpen((current) => !current)}
        className="relative grid size-9 place-items-center rounded-lg text-text-secondary hover:bg-background-subtle"
      >
        <MessageSquare aria-hidden className="size-6" strokeWidth={1.5} />
        {menu.totalUnread > 0 ? (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand-odtu-primary"
          />
        ) : null}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id="iskur-messages-panel"
          role="region"
          aria-label={t("title")}
          className="absolute right-0 top-12 z-50 w-[min(92vw,377px)] overflow-hidden rounded-2xl border border-border-default bg-background-surface shadow-lg"
        >
          <p className="px-4 py-3.5 type-title-card text-text-primary">
            {t("title")}
          </p>
          <ul>
            {menu.channels.map((channel) => (
              <li key={channel.id} className="border-t border-border-subtle">
                <Link
                  href={channelHref(channel.id)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-background-subtle"
                >
                  <span aria-hidden className="type-label text-text-muted">
                    {channelMark(channel.kind)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-label text-text-primary">
                      {channel.name}
                    </span>
                    <span className="block truncate type-caption text-text-muted">
                      {t(`subtitle.${channelSubtitle(channel)}`, {
                        count: channel.memberCount,
                        unit: channel.unitName ?? "",
                      })}
                    </span>
                  </span>
                  {channel.unopened ? (
                    <span className="rounded-full bg-status-success-bg px-3 py-1.5 type-label-sm text-status-success-text">
                      {t("new")}
                    </span>
                  ) : channel.unreadCount > 0 ? (
                    <span className="grid size-6 place-items-center rounded-full bg-brand-mentor-bg type-label-sm text-brand-mentor-strong">
                      <span aria-hidden>{channel.unreadCount}</span>
                      <span className="sr-only">
                        {t("unread", { count: channel.unreadCount })}
                      </span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={ISKUR_MESSAGES_HREF}
            onClick={() => setOpen(false)}
            className="block bg-background-subtle px-4 py-3 type-label-sm text-text-link"
          >
            {t("menu.openAll")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
