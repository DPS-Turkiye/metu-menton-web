"use client";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { IskurApplicationsState } from "@/hooks/use-iskur-applications";
import {
  IskurDocumentSlot,
  type IskurApplication,
} from "@/interfaces/iskur-onboarding";
import { iskurApplicationDocumentHref } from "@/lib/client/iskur-onboarding";
import { formatHours, scheduleMinutes } from "@/lib/iskur-onboarding";
import { formatDateTime } from "@/lib/utils";

const SLOTS = [IskurDocumentSlot.Cv, IskurDocumentSlot.Transcript] as const;

/** "Tercihler" in the placement dialog: what the intern answered on their onboarding form. */
export function IskurPreferencesPanel({
  application,
  applications,
  programId,
}: {
  application: IskurApplication | null;
  applications: IskurApplicationsState;
  programId: string;
}) {
  const t = useTranslations("iskurOnboarding.coordinator");
  const tUnits = useTranslations("iskurOnboarding.units");
  const tDays = useTranslations("iskurOnboarding.days");
  const tDocs = useTranslations("iskurOnboarding.documents");
  const locale = useLocale();
  if (!application) {
    return (
      <p className="rounded-[12px] bg-background-subtle px-4 py-3 type-body-sm text-text-secondary">
        {t("noApplication")}
      </p>
    );
  }
  const leadership = application.leadership;
  return (
    <section
      aria-label={t("preferences")}
      className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto rounded-[12px] bg-background-subtle p-4 type-body-sm text-text-secondary"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="flex-1 type-label text-text-primary">
          {t("preferences")}
        </h3>
        <p className="type-caption text-text-muted">
          {t("submittedAt", {
            date: formatDateTime(application.submittedAt, locale),
          })}
        </p>
      </div>
      <Line label={t("days")}>
        {t("daysValue", {
          days: application.weeklyDays ?? 0,
          hours: formatHours(scheduleMinutes(application.schedule), locale),
        })}
        {" · "}
        {application.schedule
          .map(
            (range) =>
              `${tDays(`short.${range.day}`)} ${range.start}–${range.end}`,
          )
          .join(", ")}
      </Line>
      <Line label={t("remaining")}>
        {t("remainingValue", { days: application.remainingIskurDays ?? 0 })}
      </Line>
      <Line label={t("units")}>
        {application.unitIds
          .map((id) => applications.unitName(id) ?? "")
          .join(" · ")}
      </Line>
      <Line label={t("roles")}>
        {application.teamRoles
          .map((role) => tUnits(`role.${role}`))
          .join(" · ")}
      </Line>
      <Line label={t("skills")}>
        {application.skills
          .map((answer) => {
            const name = applications.skillName(answer.skillId);
            return name ? `${name}: ${tUnits(`level.${answer.level}`)}` : null;
          })
          .filter((item) => item !== null)
          .join(" · ")}
      </Line>
      <Line label={t("leadership")}>
        {t(leadership.wants ? "leadershipYes" : "leadershipNo")}
      </Line>
      {leadership.wants ? (
        <dl className="flex flex-col gap-2">
          <Answer label={t("motivation")} text={leadership.motivation} />
          <Answer label={t("experience")} text={leadership.experience} />
          <Answer label={t("conflict")} text={leadership.conflict} />
        </dl>
      ) : null}
      <Line label={t("documents")}>
        <span className="flex flex-wrap gap-3">
          {SLOTS.map((slot) => {
            const file =
              slot === IskurDocumentSlot.Cv
                ? application.documents.cv
                : application.documents.transcript;
            return file ? (
              // A plain link: the route answers with an attachment, which next/link would try to render as a page.
              <a
                key={slot}
                href={iskurApplicationDocumentHref(
                  programId,
                  application.userId,
                  slot,
                )}
                className="type-label-sm text-text-link"
              >
                {t("open", { document: tDocs(slot) })}
              </a>
            ) : (
              <span key={slot}>{t("noFile", { document: tDocs(slot) })}</span>
            );
          })}
        </span>
      </Line>
    </section>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="type-label-sm text-text-primary">{label}: </span>
      {children}
    </p>
  );
}

function Answer({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <dt className="type-label-sm text-text-primary">{label}</dt>
      <dd className="whitespace-pre-line">{text ?? "—"}</dd>
    </div>
  );
}
