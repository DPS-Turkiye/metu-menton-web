"use client";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";

import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import {
  IskurWeekEventKind,
  type IskurWeekHistoryEvent,
} from "@/interfaces/iskur-weeks";
import { formatDateTime } from "@/lib/utils";

const KIND_TONES: Record<IskurWeekEventKind, StatusTone> = {
  [IskurWeekEventKind.Submitted]: StatusTone.Info,
  [IskurWeekEventKind.Approved]: StatusTone.Success,
  [IskurWeekEventKind.Revision]: StatusTone.Warning,
  [IskurWeekEventKind.Rejected]: StatusTone.Error,
  [IskurWeekEventKind.Objection]: StatusTone.Neutral,
};

/**
 * "Hafta geçmişi": every send, decision and objection of a week, oldest first. The intern, the reviewing leader and
 * the coordinators all read the same steps; nothing in them comes from peer mentoring.
 */
export function IskurWeekHistory({
  events,
}: {
  events: IskurWeekHistoryEvent[];
}) {
  const t = useTranslations("iskurWeekHistory");
  const locale = useLocale();
  const titleId = useId();
  if (events.length === 0) return null;
  return (
    <Card labelledBy={titleId} className="h-fit space-y-3">
      <h2 id={titleId} className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      <ol className="space-y-3">
        {events.map((event) => (
          <li
            key={event.step}
            className="space-y-1 border-l-2 border-border-subtle pl-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={KIND_TONES[event.kind]}>
                {t(`kinds.${event.kind}`)}
              </StatusBadge>
              <time
                dateTime={event.at}
                className="type-caption text-text-muted"
              >
                {formatDateTime(event.at, locale)}
              </time>
            </div>
            {event.by ? (
              <p className="type-caption text-text-muted">
                {event.by.fullName}
              </p>
            ) : null}
            {event.text ? (
              <p className="whitespace-pre-line type-body-sm text-text-primary">
                {event.text}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
