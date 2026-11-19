"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { useReportDuration } from "@/hooks/use-report-format";
import { percentOf } from "@/lib/iskur-weeks";

/** "Akran Mentörlüğü 2 sa 40 dk / 6 sa · %44": logged time against a target, with a bar. */
export function IskurProgressCard({
  title,
  caption,
  logged,
  target,
}: {
  title: string;
  caption: string;
  logged: number;
  target: number | null;
}) {
  const t = useTranslations("iskurWeek.progress");
  const duration = useReportDuration();
  const percent = percentOf(logged, target);
  return (
    <div className="rounded-card border border-border-default bg-background-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="type-label text-text-primary">{title}</span>
        <StatusBadge tone={StatusTone.Info}>
          {target == null
            ? duration(logged)
            : t("of", { logged: duration(logged), target: duration(target) })}
        </StatusBadge>
      </div>
      <div className="mt-3 flex items-center justify-between type-caption text-text-secondary">
        <span>{caption}</span>
        {percent == null ? null : <span>{t("percent", { percent })}</span>}
      </div>
      {/* Without a target there is nothing to measure against: a plain bar, not a 0 % progress bar. */}
      <div
        role={percent == null ? undefined : "progressbar"}
        aria-label={percent == null ? undefined : title}
        aria-valuemin={percent == null ? undefined : 0}
        aria-valuemax={percent == null ? undefined : 100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={
          percent == null || target == null
            ? undefined
            : t("of", { logged: duration(logged), target: duration(target) })
        }
        className="mt-2 h-2 overflow-hidden rounded-full bg-background-subtle"
      >
        <div
          className="h-full rounded-full bg-text-accent"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}
