"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useId } from "react";

import { ModalDialog } from "@/components/common/modal-dialog";
import { AppointmentStatusPill } from "@/components/coordinator/appointment-status-pill";
import { ProgramTypeBadge } from "@/components/ia/program-type-badge";
import { useProgramOfficeHoursAppointment } from "@/hooks/use-program-office-hours-appointment";
import { ProgramType } from "@/interfaces/program";
import type { ProgramOfficeHoursPerson } from "@/interfaces/program-office-hours";
import {
  appointmentDay,
  appointmentHours,
  historyTime,
  personName,
} from "@/lib/program-office-hours";
import { errorMessage, initials } from "@/lib/utils";

const PANEL =
  "flex h-full w-full max-w-[480px] flex-col gap-5 overflow-y-auto bg-background-surface p-7 shadow-modal outline-none";
const OVERLAY = "fixed inset-0 z-[60] flex justify-end bg-black/30";

/**
 * Randevu detayı (Figma 152:8153): the title, the time, the two people and how the request got here. What the
 * student wrote and the messages stay between the student and the academician; the drawer says so.
 */
export function AppointmentDetailDrawer({
  programId,
  requestId,
  onClose,
}: {
  programId: string;
  requestId: string;
  onClose: () => void;
}) {
  const t = useTranslations("programAppointments.detail");
  const locale = useLocale();
  const titleId = useId();
  const query = useProgramOfficeHoursAppointment(programId, requestId);
  const appointment = query.data;

  return (
    <ModalDialog
      labelledBy={titleId}
      onClose={onClose}
      panelClassName={PANEL}
      overlayClassName={OVERLAY}
      dismissOnBackdrop
    >
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="type-label text-text-secondary">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="rounded-full p-1 hover:bg-background-subtle"
        >
          <Image alt="" src="/ia/icons/close.svg" width={20} height={20} />
        </button>
      </div>

      {appointment ? (
        <>
          <div className="flex flex-wrap gap-2">
            <ProgramTypeBadge type={ProgramType.OfficeHours} />
            <AppointmentStatusPill status={appointment.status} />
          </div>
          <p className="type-h2 text-text-primary">{appointment.topic}</p>

          {appointment.startsAt ? (
            <dl className="flex gap-3 rounded-2xl bg-background-subtle p-4">
              <div className="flex flex-1 items-center gap-2.5">
                <Image
                  alt=""
                  src="/ia/icons/calendar.svg"
                  width={18}
                  height={18}
                />
                <div className="space-y-0.5">
                  <dt className="type-caption text-text-muted">{t("date")}</dt>
                  <dd className="type-label text-text-primary">
                    {appointmentDay(appointment.startsAt, locale)}
                  </dd>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2.5">
                <Image
                  alt=""
                  src="/ia/icons/clock.svg"
                  width={18}
                  height={18}
                />
                <div className="space-y-0.5">
                  <dt className="type-caption text-text-muted">{t("time")}</dt>
                  <dd className="type-label text-text-primary">
                    {appointmentHours(
                      appointment.startsAt,
                      appointment.endsAt,
                      locale,
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          ) : null}

          <section className="space-y-3">
            <h3 className="type-label text-text-secondary">
              {t("participants")}
            </h3>
            <Participant person={appointment.student} role={t("student")} />
            <Participant person={appointment.academic} role={t("academic")} />
          </section>

          <hr className="border-border-subtle" />

          <section className="space-y-2.5">
            <h3 className="type-label text-text-secondary">{t("history")}</h3>
            <ol className="space-y-2.5">
              {appointment.history.map((entry) => (
                <li
                  key={`${entry.step}-${entry.at ?? "unknown"}`}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="type-body-sm text-text-primary">
                    {t(`steps.${entry.step}`)}
                  </span>
                  {entry.at ? (
                    <time
                      dateTime={entry.at}
                      className="type-caption text-text-muted"
                    >
                      {historyTime(entry.at, locale)}
                    </time>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <div className="flex gap-2.5 rounded-2xl bg-background-subtle p-4">
            <Image
              alt=""
              src="/ia/icons/lock.svg"
              width={18}
              height={18}
              className="shrink-0"
            />
            <div className="space-y-1">
              <p className="type-label text-text-primary">
                {t("privateTitle")}
              </p>
              <p className="type-caption text-text-secondary">
                {t("privateBody")}
              </p>
            </div>
          </div>
        </>
      ) : query.error ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {errorMessage(query.error, t("loadFailed"))}
        </p>
      ) : (
        <p role="status" className="type-body-sm text-text-muted">
          {t("loading")}
        </p>
      )}
    </ModalDialog>
  );
}

function Participant({
  person,
  role,
}: {
  person: ProgramOfficeHoursPerson;
  role: string;
}) {
  const t = useTranslations("programAppointments.detail");
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-background-selected type-label-sm text-text-accent"
      >
        {initials(person.name)}
      </span>
      <div className="space-y-0.5">
        <p className="type-label text-text-primary">{personName(person)}</p>
        <p className="type-caption text-text-muted">
          {person.department
            ? t("roleWithDepartment", { role, department: person.department })
            : role}
        </p>
      </div>
    </div>
  );
}
