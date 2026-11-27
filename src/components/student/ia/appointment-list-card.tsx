import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import {
  AppointmentOutcomeBadge,
  AppointmentStatusBadge,
  InitialsAvatar,
} from "@/components/student/ia/ui";
import { AppointmentStatus, type Appointment } from "@/interfaces/appointment";
import { currentTime } from "@/lib/appointments";
import { appointmentProfileHref } from "@/lib/peer-profile-links";
import { titledName } from "@/lib/profile-completion";
import { appointmentPersonId } from "@/lib/student-appointments";
import { offeredTimes } from "@/lib/student-office-hours";
import { formatTurkishTime } from "@/lib/turkey-time";
import { formatWeekdayDayMonth } from "@/lib/utils";

function useSubject({ category, topic }: Appointment) {
  const tTopic = useTranslations("peerTopics");
  return category ? `${tTopic(category)}: ${topic}` : topic;
}

function Person({
  appointment,
  children,
}: {
  appointment: Appointment;
  children: ReactNode;
}) {
  const { counterpart } = appointment;
  return (
    <>
      <ProfilePictureLink
        href={appointmentProfileHref(appointment)}
        name={counterpart.fullName}
      >
        <InitialsAvatar
          personId={appointmentPersonId(appointment)}
          name={counterpart.fullName}
        />
      </ProfilePictureLink>
      <div className="min-w-0 flex-1 basis-56">
        <h3 className="type-label-lg text-text-primary">
          {titledName(counterpart.title, counterpart.fullName)}
        </h3>
        <p className="type-body-sm break-words text-text-muted">{children}</p>
        <Notes appointment={appointment} />
      </div>
    </>
  );
}

function Notes({ appointment }: { appointment: Appointment }) {
  const t = useTranslations("iaStudent.appointments");
  const reason =
    appointment.status === AppointmentStatus.Rejected ||
    appointment.status === AppointmentStatus.Cancelled
      ? appointment.rejectReason
      : null;
  // A request with other times offered quotes the note beside them instead.
  const message =
    appointment.status === AppointmentStatus.AlternativeProposed
      ? null
      : appointment.counterpartMessage;
  return (
    <>
      {message ? (
        <p className="mt-1 type-body-sm break-words text-text-secondary">
          {t("counterpartMessage", { message })}
        </p>
      ) : null}
      {reason ? (
        <p className="mt-1 type-body-sm break-words text-text-secondary">
          {t("rejectReason", { reason })}
        </p>
      ) : null}
    </>
  );
}

/** One line of Randevularım's lists (Figma 3.6): who, which kind, when and about what, with its status. */
export function AppointmentRow({
  appointment,
  actions,
  outcome = false,
  tourAnchor,
}: {
  appointment: Appointment;
  actions?: ReactNode;
  /** Geçmiş: a meeting that was held says so. */
  outcome?: boolean;
  tourAnchor?: string | undefined;
}) {
  const tKind = useTranslations("iaStudent.common.kind");
  const locale = useLocale();
  const time = currentTime(appointment);
  const subject = useSubject(appointment);
  return (
    <article
      data-tour={tourAnchor}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6"
    >
      <Person appointment={appointment}>
        {[
          tKind(appointment.kind),
          formatWeekdayDayMonth(time.startsAt, locale),
          `${formatTurkishTime(time.startsAt, locale)} – ${formatTurkishTime(time.endsAt, locale)}`,
          subject,
        ].join(" · ")}
      </Person>
      {outcome ? (
        <AppointmentOutcomeBadge status={appointment.status} />
      ) : (
        <AppointmentStatusBadge status={appointment.status} />
      )}
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </article>
  );
}

/** A request the other side answered with other times (Figma 3.6, "Yanıtını bekliyor"): only the student can settle it. */
export function AppointmentReplyCard({
  appointment,
  actions,
}: {
  appointment: Appointment;
  actions?: ReactNode;
}) {
  const t = useTranslations("iaStudent.appointments");
  const tKind = useTranslations("iaStudent.common.kind");
  const locale = useLocale();
  const subject = useSubject(appointment);
  const day = (startsAt: string) => formatWeekdayDayMonth(startsAt, locale);
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-status-warning-border bg-background-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Person appointment={appointment}>
          {`${tKind(appointment.kind)} · ${subject}`}
        </Person>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-background-subtle px-4 py-3">
        <p className="flex flex-col">
          <span className="type-caption text-text-muted">
            {t("alternative.requested")}
          </span>
          <s className="type-label text-text-muted">
            {`${day(appointment.startsAt)} · ${formatTurkishTime(appointment.startsAt, locale)}`}
          </s>
        </p>
        <ArrowRight
          aria-hidden
          className="size-4 text-icon-default"
          strokeWidth={1.5}
        />
        <p className="flex flex-col">
          <span className="type-caption text-text-muted">
            {t("alternative.proposed")}
          </span>
          {offeredTimes(appointment).map((time) => (
            <span
              key={time.startsAt}
              className="type-label-lg text-text-primary"
            >
              {`${day(time.startsAt)} · ${formatTurkishTime(time.startsAt, locale)} – ${formatTurkishTime(time.endsAt, locale)}`}
            </span>
          ))}
        </p>
      </div>
      {appointment.counterpartMessage ? (
        <p className="type-body break-words text-text-secondary">
          {t("quote", { message: appointment.counterpartMessage })}
        </p>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="type-body-sm text-text-muted">{t("declineHint")}</p>
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        </div>
      ) : null}
    </article>
  );
}
