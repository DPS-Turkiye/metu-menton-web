"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { StudentAvatar } from "@/components/academician/student-avatar";
import type { AcademicianAppointmentsCalendar } from "@/hooks/use-academician-appointments-calendar";

/** The right-hand column of Randevularım: what waits for the academician and for the student. */
export function AppointmentsRail({
  calendar,
}: {
  calendar: AcademicianAppointmentsCalendar;
}) {
  return (
    <div className="space-y-5">
      <PendingCard calendar={calendar} />
      {calendar.rail.awaiting.length > 0 ? (
        <AwaitingCard calendar={calendar} />
      ) : null}
      <MonthSummary calendar={calendar} />
    </div>
  );
}

function MonthSummary({
  calendar,
}: {
  calendar: AcademicianAppointmentsCalendar;
}) {
  const t = useTranslations("iaAcademician.appointments.rail.summary");
  const titleId = useId();
  const summary = calendar.monthSummary;
  if (!summary) return null;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-1.5">
      <h2 id={titleId} className="type-label text-text-primary">
        {t("title", { month: summary.month })}
      </h2>
      <p className="type-body-sm text-text-secondary">
        {t("body", {
          confirmed: summary.confirmed,
          waiting: summary.waiting,
        })}
      </p>
    </section>
  );
}

function PendingCard({
  calendar,
}: {
  calendar: AcademicianAppointmentsCalendar;
}) {
  const t = useTranslations("iaAcademician.appointments.rail");
  const titleId = useId();
  const { pending } = calendar.rail;
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-border-default bg-background-surface p-4"
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <h2 id={titleId} className="type-label-lg text-text-primary">
          {t("pendingTitle")}
        </h2>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-status-warning-bg px-1.5 type-label-sm text-status-warning-text">
          {pending.length}
        </span>
      </div>
      {pending.length > 0 ? (
        <ul className="divide-y divide-border-default border-t border-border-default">
          {pending.map((request) => (
            <li key={request.id}>
              <button
                type="button"
                onClick={request.open}
                className="flex w-full items-center gap-4 rounded-lg px-1 py-2.5 text-left hover:bg-background-subtle focus-visible:outline-2 focus-visible:outline-border-selected"
              >
                <StudentAvatar name={request.studentName} small />
                <RailPerson name={request.studentName} detail={request.when} />
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-icon-default"
                  strokeWidth={1.5}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border-default px-1 pt-3 type-body-sm text-text-secondary">
          {t("pendingEmpty")}
        </p>
      )}
    </section>
  );
}

/** Requests answered with a question or with other times: the student's turn. */
function AwaitingCard({
  calendar,
}: {
  calendar: AcademicianAppointmentsCalendar;
}) {
  const t = useTranslations("iaAcademician.appointments.rail");
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-2xl bg-background-subtle p-4"
    >
      <h2 id={titleId} className="type-label text-text-primary">
        {t("awaitingTitle")}
      </h2>
      <ul>
        {calendar.rail.awaiting.map((request) => (
          <li key={request.id}>
            <button
              type="button"
              onClick={request.open}
              className="flex w-full items-center gap-4 rounded-lg px-1 py-2 text-left hover:bg-background-muted focus-visible:outline-2 focus-visible:outline-border-selected"
            >
              <StudentAvatar name={request.studentName} small />
              <RailPerson
                name={request.studentName}
                detail={
                  request.proposedWhen === null
                    ? t("asked")
                    : t("proposed", { when: request.proposedWhen })
                }
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RailPerson({ name, detail }: { name: string; detail: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block type-label break-words text-text-primary">
        {name}
      </span>
      <span className="block type-body-sm text-text-muted">{detail}</span>
    </span>
  );
}
