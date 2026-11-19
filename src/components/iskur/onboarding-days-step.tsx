"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useId } from "react";

import { Card } from "@/components/ia/card";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import type { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import { WEEKDAY_ORDER } from "@/interfaces/mentor";
import { formatHours } from "@/lib/iskur-onboarding";
import {
  ISKUR_MINUTES_PER_DAY,
  ISKUR_WEEKLY_DAYS,
} from "@/lib/iskur-workspace";

type Wizard = ReturnType<typeof useIskurOnboarding>;

/** 02 · Görev günleri (Figma 286:283): days a week, the hours of each day, and the İŞKUR days left. */
export function OnboardingDaysStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.days");
  const locale = useLocale();
  const priorId = useId();
  const priorHelpId = useId();
  const form = wizard.form;
  const context = wizard.context;
  if (!form || !context) return null;
  const hours = (minutes: number) => formatHours(minutes, locale);
  const enough = wizard.remainingDays >= wizard.neededDays;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("intro")}</p>
      </header>

      <Card className="flex flex-col gap-4">
        <h2 className="type-title-card text-text-primary">{t("countTitle")}</h2>
        <div
          role="group"
          aria-label={t("countTitle")}
          className="grid gap-3 sm:grid-cols-3"
        >
          {ISKUR_WEEKLY_DAYS.map((days) => {
            const selected = form.weeklyDays === days;
            return (
              <button
                key={days}
                type="button"
                aria-pressed={selected}
                onClick={() => wizard.setWeeklyDays(days)}
                className={`flex flex-col gap-1 rounded-[12px] p-4 text-left focus-visible:outline-2 focus-visible:outline-border-selected ${
                  selected
                    ? "border-2 border-border-selected bg-background-selected"
                    : "border border-border-default bg-background-surface"
                }`}
              >
                <span
                  className={`type-h4 ${selected ? "text-text-accent" : "text-text-primary"}`}
                >
                  {t("option", { days })}
                </span>
                <span className="type-body-sm text-text-secondary">
                  {t("optionHours", {
                    hours: hours(days * ISKUR_MINUTES_PER_DAY),
                  })}
                </span>
              </button>
            );
          })}
        </div>
        <p className="type-caption text-text-muted">{t("leaderHint")}</p>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 type-title-card text-text-primary">
            {t("hoursTitle")}
          </h2>
          <span
            className={`inline-flex h-8 items-center rounded-full px-3 type-label-sm ${
              wizard.scheduleMatches
                ? "bg-status-success-bg text-status-success-text"
                : "bg-status-neutral-bg text-status-neutral-text"
            }`}
          >
            {t(wizard.scheduleMatches ? "tallyOk" : "tally", {
              done: hours(wizard.totalMinutes),
              target: hours(wizard.targetMinutes),
            })}
          </span>
        </div>
        <p className="type-body-sm text-text-secondary">{t("hoursIntro")}</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAY_ORDER.map((day) => {
            const selected = wizard.scheduledDays.includes(day);
            const minutes = wizard.dayMinutes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                aria-label={t(`long.${day}`)}
                onClick={() => wizard.toggleDay(day)}
                className={`flex flex-col items-center gap-1 rounded-[12px] px-2 py-3 text-center focus-visible:outline-2 focus-visible:outline-border-selected ${
                  selected
                    ? "border-2 border-border-selected bg-background-selected"
                    : "border border-border-default bg-background-surface"
                }`}
              >
                <span
                  className={`type-label ${selected ? "text-text-accent" : "text-text-primary"}`}
                >
                  {t(`short.${day}`)}
                </span>
                <span className="type-caption text-text-secondary">
                  {selected
                    ? t("dayHours", { hours: hours(minutes) })
                    : t("dayEmpty")}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-[12px] bg-background-subtle p-4">
          <p className="type-label text-text-primary">{t("entryTitle")}</p>
          {wizard.scheduledDays.length === 0 ? (
            <p className="type-body-sm text-text-muted">{t("noDays")}</p>
          ) : null}
          {wizard.scheduledDays.map((day) => (
            <div
              key={day}
              className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3"
            >
              <p className="type-label text-text-primary sm:w-24 sm:pt-2.5">
                {t(`long.${day}`)}
              </p>
              <div className="flex flex-1 flex-col gap-2">
                {wizard.rowsOf(day).map((row) => (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="time"
                      value={row.start}
                      aria-label={t("start", { day: t(`long.${day}`) })}
                      onChange={(event) =>
                        wizard.updateRange(row.key, {
                          start: event.target.value,
                        })
                      }
                      className={`${ISKUR_FIELD_CLASS} h-10 w-[104px] px-2 py-0 text-center`}
                    />
                    <span aria-hidden className="type-label text-text-muted">
                      –
                    </span>
                    <input
                      type="time"
                      value={row.end}
                      aria-label={t("end", { day: t(`long.${day}`) })}
                      onChange={(event) =>
                        wizard.updateRange(row.key, { end: event.target.value })
                      }
                      className={`${ISKUR_FIELD_CLASS} h-10 w-[104px] px-2 py-0 text-center`}
                    />
                    <span className="type-label-sm text-text-secondary">
                      {t("dayHours", {
                        hours: hours(wizard.rangeMinutesOf(row)),
                      })}
                    </span>
                    <button
                      type="button"
                      aria-label={t("removeRange", { day: t(`long.${day}`) })}
                      onClick={() => wizard.removeRange(row.key)}
                      className="px-1 type-label text-text-muted hover:text-text-primary"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {wizard.canAddRange(day) ? (
                  <button
                    type="button"
                    onClick={() => wizard.addRange(day)}
                    className="self-start type-label-sm text-text-link"
                  >
                    {t("addRange")}
                  </button>
                ) : null}
              </div>
              <p className="type-label text-text-primary sm:pt-2.5">
                {t("dayHours", { hours: hours(wizard.dayMinutes(day)) })}
              </p>
            </div>
          ))}
        </div>

        <div
          role="status"
          className={`flex flex-wrap items-center gap-3 rounded-[12px] px-4 py-3 ${
            wizard.scheduleMatches
              ? "bg-status-success-bg text-status-success-text"
              : "bg-status-warning-bg text-status-warning-text"
          }`}
        >
          <p className="flex-1 type-label">
            {wizard.scheduleMatches
              ? t("totalOk", {
                  hours: hours(wizard.totalMinutes),
                  days: form.weeklyDays ?? 0,
                })
              : t("totalOff", { hours: hours(wizard.totalMinutes) })}
          </p>
          <p className="type-caption">
            {t("target", {
              days: form.weeklyDays ?? 0,
              hours: hours(wizard.targetMinutes),
            })}
          </p>
        </div>
        {wizard.scheduleOverlaps ? (
          <p role="alert" className="type-body-sm text-status-error-text">
            {t("overlap")}
          </p>
        ) : null}
        <p className="type-caption text-text-muted">{t("totalHint")}</p>
        <InlineAlert tone={StatusTone.Info} title={t("alertTitle")}>
          {t("alertBody")}
        </InlineAlert>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="type-title-card text-text-primary">
          {t("rightsTitle")}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor={priorId} className="type-label text-text-primary">
              {t("priorLabel")}
            </label>
            <input
              id={priorId}
              type="number"
              inputMode="numeric"
              min={0}
              max={context.maxIskurDays}
              value={form.priorIskurDays ?? ""}
              aria-describedby={priorHelpId}
              onChange={(event) => wizard.setPriorDays(event.target.value)}
              className={`${ISKUR_FIELD_CLASS} h-12`}
            />
            <p
              id={priorHelpId}
              className="flex items-center gap-1 type-caption text-text-secondary"
            >
              <Image
                src="/ia/profile/info-alt.svg"
                alt=""
                width={16}
                height={16}
              />
              {t("priorHelp", { max: context.maxIskurDays })}
            </p>
          </div>
          <div
            className={`flex flex-col gap-0.5 rounded-[12px] p-4 sm:w-[280px] ${
              enough
                ? "bg-status-success-bg text-status-success-text"
                : "bg-status-warning-bg text-status-warning-text"
            }`}
          >
            <p className="type-label">
              {t("remaining", { days: wizard.remainingDays })}
            </p>
            <p className="type-caption">
              {t(enough ? "enough" : "notEnough", {
                needed: wizard.neededDays,
              })}
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
