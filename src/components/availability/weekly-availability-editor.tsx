"use client";

import { Minus, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { NumberStepper } from "@/components/common/number-stepper";
import { ToggleSwitch } from "@/components/common/toggle-switch";
import type { WeeklyAvailabilityForm } from "@/hooks/use-weekly-availability-form";
import {
  AVAILABILITY_NUMBER_FIELDS,
  exceptionLabel,
} from "@/lib/mentor-availability";

const sectionLabelClass = "type-overline text-text-secondary";
const timeInputClass =
  "h-11 w-24 rounded-input border border-border-control bg-background-surface px-3 type-body text-text-primary focus-visible:outline-2 focus-visible:outline-border-selected [&::-webkit-calendar-picker-indicator]:hidden";
const iconButtonClass =
  "grid size-6 shrink-0 place-items-center rounded-full text-text-accent focus-visible:outline-2 focus-visible:outline-border-selected";
const fieldClass =
  "h-11 w-full rounded-input border border-border-control bg-background-surface px-3 type-body text-text-primary focus-visible:outline-2 focus-visible:outline-border-selected";
const smallButtonClass = "type-button-sm";

/**
 * Weekly time ranges, the owner's number fields and unavailable dates, edited through
 * useWeeklyAvailabilityForm. The caller frames it (a dialog, a wizard step) and owns the save
 * button; the owner's source decides which number fields appear.
 */
export function WeeklyAvailabilityEditor({
  editor,
  showUnavailableDates = true,
  className = "",
}: {
  editor: WeeklyAvailabilityForm;
  showUnavailableDates?: boolean;
  className?: string;
}) {
  const t = useTranslations("availabilityEditor");
  const locale = useLocale();
  const { draft } = editor;
  const shownNumberFields = AVAILABILITY_NUMBER_FIELDS.filter((item) =>
    editor.numberFields.includes(item.field),
  );

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {editor.loadError ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {editor.loadError}
        </p>
      ) : !draft ? (
        <p className="type-body-sm text-text-muted">{t("loading")}</p>
      ) : (
        <>
          <section className="flex flex-col gap-2.5">
            <h3 className={sectionLabelClass}>{t("weekly")}</h3>
            <ul className="divide-y divide-border-default rounded-2xl border border-border-default bg-background-surface">
              {editor.days.map(({ day, label, ranges }) => {
                const open = ranges.length > 0;
                return (
                  <li
                    key={day}
                    className="flex min-h-[60px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <ToggleSwitch
                        checked={open}
                        label={t("dayOpen", { day: label })}
                        onChange={() => editor.toggleDay(day)}
                      />
                      <span
                        className={`w-24 type-label ${open ? "text-text-primary" : "text-text-muted"}`}
                      >
                        {label}
                      </span>
                    </div>
                    {open ? (
                      <div className="ml-auto flex flex-col items-end gap-2">
                        {ranges.map((range, index) => {
                          const first = index === 0;
                          const name = t("range", {
                            day: label,
                            number: index + 1,
                          });
                          return (
                            <div
                              key={range.key}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="time"
                                aria-label={t("rangeStart", { range: name })}
                                value={range.startTime}
                                onChange={(event) =>
                                  editor.updateRange(
                                    range.key,
                                    "startTime",
                                    event.target.value,
                                  )
                                }
                                className={timeInputClass}
                              />
                              <span className="type-body text-text-secondary">
                                –
                              </span>
                              <input
                                type="time"
                                aria-label={t("rangeEnd", { range: name })}
                                value={range.endTime}
                                onChange={(event) =>
                                  editor.updateRange(
                                    range.key,
                                    "endTime",
                                    event.target.value,
                                  )
                                }
                                className={timeInputClass}
                              />
                              {first ? (
                                <button
                                  type="button"
                                  onClick={() => editor.addRange(day)}
                                  aria-label={t("addRange", { day: label })}
                                  className={iconButtonClass}
                                >
                                  <Plus
                                    aria-hidden
                                    className="size-4"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => editor.removeRange(range.key)}
                                  aria-label={t("removeRange", {
                                    range: name,
                                  })}
                                  className={iconButtonClass}
                                >
                                  <Minus
                                    aria-hidden
                                    className="size-4"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="type-body-sm text-text-muted">
                        {t("closed")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {shownNumberFields.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <h3 className={sectionLabelClass}>{t("defaults")}</h3>
              {shownNumberFields.map(({ field, min, max, inMinutes }) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="type-body text-text-secondary">
                    {editor.numberFieldLabels[field] ?? t(field)}
                  </span>
                  <NumberStepper
                    label={editor.numberFieldLabels[field] ?? t(field)}
                    value={draft[field]}
                    min={min}
                    max={max}
                    unit={inMinutes ? t("minutesUnit") : undefined}
                    onChange={(value) => editor.setNumber(field, value)}
                    onStep={(direction) => editor.stepNumber(field, direction)}
                  />
                </div>
              ))}
            </section>
          ) : null}

          {showUnavailableDates ? (
            <section className="flex flex-col gap-2.5">
              <h3 className={sectionLabelClass}>{t("unavailable")}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {draft.exceptions.map((item, index) => {
                  const text = exceptionLabel(item, locale);
                  return (
                    <span
                      key={`${item.startsOn}-${item.endsOn}`}
                      className="group relative inline-flex items-center rounded-full border border-border-default bg-background-muted px-3 py-1.5 type-label-sm text-text-secondary"
                    >
                      {text}
                      {/* Hidden until hover or focus so the chip reads as in the design. */}
                      <button
                        type="button"
                        onClick={() => editor.removeException(index)}
                        aria-label={t("removeDate", { date: text })}
                        className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full border border-border-default bg-background-surface text-icon-default opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X className="size-2.5" strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}
                {editor.isAddingException ? null : (
                  <button
                    type="button"
                    onClick={editor.openExceptionForm}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-border-default bg-background-surface px-3 py-1.5 text-text-accent ${smallButtonClass}`}
                  >
                    <Plus aria-hidden className="size-3.5" strokeWidth={1.5} />
                    {t("addDate")}
                  </button>
                )}
              </div>
              {editor.isAddingException ? (
                <div className="grid gap-2 rounded-xl border border-border-default p-3 sm:grid-cols-3">
                  <input
                    type="date"
                    aria-label={t("startDate")}
                    value={editor.exception.startsOn}
                    onChange={(event) =>
                      editor.setExceptionField("startsOn", event.target.value)
                    }
                    className={fieldClass}
                  />
                  <input
                    type="date"
                    aria-label={t("endDate")}
                    value={editor.exception.endsOn}
                    onChange={(event) =>
                      editor.setExceptionField("endsOn", event.target.value)
                    }
                    className={fieldClass}
                  />
                  <input
                    aria-label={t("reason")}
                    value={editor.exception.reason}
                    onChange={(event) =>
                      editor.setExceptionField("reason", event.target.value)
                    }
                    placeholder={t("reasonPlaceholder")}
                    className={fieldClass}
                  />
                  <div className="flex justify-end gap-2 sm:col-span-3">
                    <button
                      type="button"
                      onClick={editor.closeExceptionForm}
                      className={`rounded-full border border-border-default bg-background-surface px-3 py-1.5 text-text-primary ${smallButtonClass}`}
                    >
                      {t("cancelDate")}
                    </button>
                    <button
                      type="button"
                      onClick={editor.addException}
                      className={`rounded-full bg-action-primary-bg px-3 py-1.5 text-action-primary-fg ${smallButtonClass}`}
                    >
                      {t("confirmDate")}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
      {editor.error ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {editor.error}
        </p>
      ) : null}
    </div>
  );
}
