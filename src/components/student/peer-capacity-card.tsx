"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import type { PeerMentorCapacity } from "@/lib/peer-mentoring";

/** "Kapasiten" (Figma 7.1): active mentees against the limit, what happens when it fills, and where to change it. */
export function PeerCapacityCard({
  capacity,
  onEdit,
}: {
  capacity: PeerMentorCapacity;
  onEdit: () => void;
}) {
  const t = useTranslations("iaIskur.give.capacity");
  // Talepler and Menteelerim both show it, and every panel stays mounted.
  const titleId = useId();
  return (
    <Card
      compact
      labelledBy={titleId}
      className="flex flex-col items-start gap-3"
    >
      <h2 id={titleId} className="type-label-lg text-text-primary">
        {t("title")}
      </h2>
      <p className="flex items-end gap-1.5">
        <span className="type-metric text-text-primary">{capacity.used}</span>
        <span className="type-body text-text-secondary">
          {capacity.capacity === null
            ? t("noLimit")
            : t("ofCapacity", { capacity: capacity.capacity })}
        </span>
      </p>
      <PeerCapacityBar capacity={capacity} label={t("title")} />
      <p className="type-body-sm text-text-muted">
        {t(`note.${capacity.note}`, {
          free:
            capacity.capacity === null
              ? 0
              : capacity.capacity - capacity.filled,
        })}
      </p>
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Small}
        className="-ml-3 text-text-accent!"
        onClick={onEdit}
      >
        {t("edit")}
      </Button>
    </Card>
  );
}

/** The fill bar; nothing without a limit. */
export function PeerCapacityBar({
  capacity,
  label,
}: {
  capacity: PeerMentorCapacity;
  label: string;
}) {
  const t = useTranslations("iaIskur.give.capacity");
  if (capacity.capacity === null) return null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={capacity.capacity}
      aria-valuenow={capacity.filled}
      aria-valuetext={t("valueText", {
        used: capacity.used,
        capacity: capacity.capacity,
      })}
      className="h-2 w-full overflow-hidden rounded-full bg-background-muted"
    >
      <div
        className="h-2 rounded-full bg-action-accent"
        style={{ width: `${String(capacity.percent)}%` }}
      />
    </div>
  );
}
