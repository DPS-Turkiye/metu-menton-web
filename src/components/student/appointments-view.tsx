"use client";

import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InlineAlert } from "@/components/ia/inline-alert";
import { PageHeader } from "@/components/ia/page-header";
import { ProgramTypeBadge } from "@/components/ia/program-type-badge";
import { StatusTone } from "@/components/ia/status-badge";
import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import {
  AppointmentDayGrid,
  AppointmentMonthGrid,
  AppointmentTimeGrid,
  kindSwatch,
} from "@/components/student/ia/appointment-calendar";
import {
  AppointmentReplyCard,
  AppointmentRow,
} from "@/components/student/ia/appointment-list-card";
import { AppointmentRequestsPanel } from "@/components/student/ia/appointment-requests-panel";
import {
  OfficeHoursAlternativeActions,
  OfficeHoursWithdrawAction,
} from "@/components/student/ia/office-hours-alternative-actions";
import { OfficeHoursCancelAction } from "@/components/student/ia/office-hours-cancel-action";
import {
  AppointmentStatusBadge,
  InitialsAvatar,
  SectionHeader,
} from "@/components/student/ia/ui";
import {
  useStudentAppointments,
  type StudentAppointmentsModel,
  type StudentAppointmentsOptions,
} from "@/hooks/use-student-appointments";
import {
  AppointmentKind,
  AppointmentStatus,
  type Appointment,
} from "@/interfaces/appointment";
import { ProgramType } from "@/interfaces/program";
import { currentTime } from "@/lib/appointments";
import { monthName, timeLabel } from "@/lib/calendar";
import { appointmentProfileHref } from "@/lib/peer-profile-links";
import {
  calendarTitle,
  selectedDayTitle,
  shortPersonName,
} from "@/lib/student-appointments";
import {
  canAnswerAlternative,
  canCancelOfficeHours,
  canWithdrawOfficeHours,
  offeredTimes,
} from "@/lib/student-office-hours";
import { formatDayMonth } from "@/lib/utils";
import {
  AppointmentRequestGroup,
  AppointmentsTab,
  AppointmentsView,
} from "@/types/student-appointments";

const FIND_MENTOR_HREF = "/student/peer-mentoring";
const VIEWS = Object.values(AppointmentsView);
const TABS = Object.values(AppointmentsTab);
const KIND_PROGRAM_TYPE: Record<AppointmentKind, ProgramType> = {
  [AppointmentKind.OfficeHours]: ProgramType.OfficeHours,
  [AppointmentKind.PeerMentoring]: ProgramType.PeerMentoring,
};

/** The ARIA tabs keys: arrows move to the neighbouring tab (wrapping), Home and End to the ends. */
function tabAfterKey(current: AppointmentsTab, key: string) {
  const index = TABS.indexOf(current);
  switch (key) {
    case "ArrowRight":
      return TABS[(index + 1) % TABS.length];
    case "ArrowLeft":
      return TABS[(index - 1 + TABS.length) % TABS.length];
    case "Home":
      return TABS[0];
    case "End":
      return TABS.at(-1);
    default:
      return undefined;
  }
}

type RenderActions = ((appointment: Appointment) => ReactNode) | undefined;

/** The card's buttons: Office Hours' own answer to a proposed time or its cancel, then whatever an edition adds. */
function actionsFor(
  appointment: Appointment,
  renderActions: RenderActions,
  now: Date,
) {
  const answer = canAnswerAlternative(appointment) ? (
    <OfficeHoursAlternativeActions appointment={appointment} />
  ) : null;
  const cancel = canCancelOfficeHours(appointment, now) ? (
    <OfficeHoursCancelAction appointment={appointment} />
  ) : null;
  const withdraw = canWithdrawOfficeHours(appointment) ? (
    <OfficeHoursWithdrawAction appointment={appointment} />
  ) : null;
  const own =
    answer || cancel || withdraw ? (
      <>
        {answer}
        {withdraw}
        {cancel}
      </>
    ) : null;
  const extra = renderActions?.(appointment) ?? null;
  return own || extra ? (
    <>
      {own}
      {extra}
    </>
  ) : null;
}

/**
 * Randevularım (Figma 3.6 list, 99:2 / 99:228 / 99:390 calendars). Extension points for other student
 * editions: `filter` narrows every view, `toolbar` renders under the header (İŞKUR's role filter), and
 * `renderActions` adds a kind's answer buttons to a card (Office Hours' accept / decline).
 */
export function StudentAppointmentsView({
  sentTo = null,
  filter,
  toolbar,
  renderActions,
}: {
  /** Who a request was just sent to: shows the "Randevu talebin gönderildi" banner and opens Talepler. */
  sentTo?: string | null;
  filter?: StudentAppointmentsOptions["filter"];
  toolbar?: ReactNode;
  renderActions?: RenderActions;
}) {
  const t = useTranslations("iaStudent.appointments");
  const appointments = useStudentAppointments({
    filter,
    initialTab: sentTo ? AppointmentsTab.Requests : AppointmentsTab.Upcoming,
  });

  const banner = sentTo ? (
    <div data-tour="appointment-request-sent">
      <InlineAlert
        tone={StatusTone.Success}
        title={t("sent.title")}
        className="bg-status-success-bg"
      >
        {t("sent.body", { name: sentTo })}
      </InlineAlert>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        actions={
          <div
            role="group"
            aria-label={t("viewLabel")}
            className="flex flex-wrap"
          >
            {VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={appointments.view === view}
                onClick={() => appointments.setView(view)}
                className={`h-9 rounded-full px-4 type-label ${
                  appointments.view === view
                    ? "bg-background-surface text-text-accent shadow-raised"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t(`views.${view}`)}
              </button>
            ))}
          </div>
        }
      />
      {toolbar}
      {/* The list puts it under its tabs (Figma 3.6). */}
      {appointments.view === AppointmentsView.List ? null : banner}
      <AppointmentsBody
        appointments={appointments}
        renderActions={renderActions}
        banner={banner}
      />
    </div>
  );
}

function AppointmentsBody({
  appointments,
  renderActions,
  banner,
}: {
  appointments: StudentAppointmentsModel;
  renderActions: RenderActions;
  banner: ReactNode;
}) {
  const t = useTranslations("iaStudent.appointments");
  if (appointments.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (appointments.error) {
    return (
      <InlineAlert tone={StatusTone.Error} title={t("error")}>
        <Button
          variant={ButtonVariant.Ghost}
          size={ButtonSize.Small}
          disabled={appointments.isRetrying}
          onClick={appointments.retry}
          className="mt-2"
        >
          {t("retry")}
        </Button>
      </InlineAlert>
    );
  }
  if (appointments.isEmpty) {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <h2 className="type-title-card text-text-primary">{t("empty")}</h2>
        <p className="type-body-sm text-text-secondary">{t("emptyBody")}</p>
        <Button href={FIND_MENTOR_HREF}>{t("findMentor")}</Button>
      </Card>
    );
  }
  return appointments.view === AppointmentsView.List ? (
    <ListView
      appointments={appointments}
      renderActions={renderActions}
      banner={banner}
    />
  ) : (
    <CalendarView appointments={appointments} renderActions={renderActions} />
  );
}

function ListView({
  appointments,
  renderActions,
  banner,
}: {
  appointments: StudentAppointmentsModel;
  renderActions: RenderActions;
  banner: ReactNode;
}) {
  const t = useTranslations("iaStudent.appointments");
  const { tab, requestGroups } = appointments;
  const actions = (item: Appointment) =>
    actionsFor(item, renderActions, appointments.now);
  return (
    <div className="flex flex-col gap-8">
      <div
        role="tablist"
        aria-label={t("tabLabel")}
        className="flex flex-wrap"
        onKeyDown={(event) => {
          const next = tabAfterKey(tab, event.key);
          if (!next) return;
          event.preventDefault();
          appointments.setTab(next);
          event.currentTarget
            .querySelector<HTMLElement>(`#appointments-tab-${next}`)
            ?.focus();
        }}
      >
        {TABS.map((item) => {
          const active = tab === item;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              id={`appointments-tab-${item}`}
              aria-selected={active}
              aria-controls="appointments-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => appointments.setTab(item)}
              className={`flex h-12 items-center gap-2 border-b-2 px-2 type-label ${
                active
                  ? "border-action-accent text-text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t(`tabs.${item}`)}
              {item === AppointmentsTab.Past ? null : (
                <span
                  className={`grid h-5 min-w-6 place-items-center rounded-full px-1.5 type-label-sm ${
                    active
                      ? "bg-background-selected text-text-accent"
                      : "bg-background-muted text-text-secondary"
                  }`}
                >
                  {appointments.tabs[item].length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {banner}
      <div
        role="tabpanel"
        id="appointments-panel"
        aria-labelledby={`appointments-tab-${tab}`}
        className="flex flex-col gap-8"
      >
        {appointments.tabs[tab].length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-default p-6 type-body-sm text-text-muted">
            {t(`tabEmpty.${tab}`)}
          </p>
        ) : tab === AppointmentsTab.Requests ? (
          <>
            <RequestSection
              id="appointments-awaiting-you"
              title={t("sections.awaitingYou")}
              items={requestGroups[AppointmentRequestGroup.AwaitingYou]}
            >
              {(items) => (
                <ul className="flex flex-col gap-4">
                  {items.map((item) => (
                    <li key={item.id}>
                      <AppointmentReplyCard
                        appointment={item}
                        actions={actions(item)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </RequestSection>
            <RequestSection
              id="appointments-awaiting-them"
              title={t("sections.awaitingThem")}
              items={requestGroups[AppointmentRequestGroup.AwaitingThem]}
            >
              {(items) => <Rows items={items} actions={actions} />}
            </RequestSection>
          </>
        ) : (
          <Rows
            items={appointments.tabs[tab]}
            actions={actions}
            outcome={tab === AppointmentsTab.Past}
            tourAnchor={
              tab === AppointmentsTab.Upcoming
                ? "appointments-first-row"
                : undefined
            }
          />
        )}
      </div>
      <p className="flex items-start gap-2 type-body-sm text-text-muted">
        <Info
          aria-hidden
          className="mt-0.5 size-4 shrink-0"
          strokeWidth={1.5}
        />
        {t("statusHint")}
      </p>
    </div>
  );
}

function RequestSection({
  id,
  title,
  items,
  children,
}: {
  id: string;
  title: string;
  items: Appointment[];
  children: (items: Appointment[]) => ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <SectionHeader id={id} title={title} hint={String(items.length)} />
      {children(items)}
    </section>
  );
}

function Rows({
  items,
  actions,
  outcome = false,
  tourAnchor,
}: {
  items: Appointment[];
  actions: (appointment: Appointment) => ReactNode;
  outcome?: boolean;
  /** On the first row only. */
  tourAnchor?: string | undefined;
}) {
  return (
    <ul className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface">
      {items.map((item, index) => (
        <li key={item.id}>
          <AppointmentRow
            appointment={item}
            actions={actions(item)}
            outcome={outcome}
            tourAnchor={index === 0 ? tourAnchor : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

function CalendarView({
  appointments,
  renderActions,
}: {
  appointments: StudentAppointmentsModel;
  renderActions: RenderActions;
}) {
  const t = useTranslations("iaStudent.appointments.calendar");
  const locale = useLocale();
  const isMonth = appointments.view === AppointmentsView.Month;
  const day = appointments.days[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card labelledBy="appointments-calendar-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="appointments-calendar-title"
            className="type-h4 text-text-primary"
          >
            {calendarTitle(appointments.view, appointments.anchor, locale)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Small}
              onClick={appointments.goToday}
            >
              {t("today")}
            </Button>
            <button
              type="button"
              aria-label={t("previous")}
              onClick={appointments.previous}
              className="grid size-9 place-items-center rounded-xl text-icon-default hover:bg-background-subtle"
            >
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={t("next")}
              onClick={appointments.next}
              className="grid size-9 place-items-center rounded-xl text-icon-default hover:bg-background-subtle"
            >
              <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {isMonth ? (
          <AppointmentMonthGrid
            cells={appointments.month}
            today={appointments.today}
            selectedDay={appointments.selectedDay}
            onSelectDay={appointments.selectDay}
          />
        ) : appointments.view === AppointmentsView.Day && day ? (
          <AppointmentDayGrid
            day={day.day}
            items={day.items}
            nowLine={appointments.nowLine}
            clock={appointments.clock}
            selectedId={appointments.selected?.id ?? null}
            onSelect={appointments.select}
          />
        ) : (
          <AppointmentTimeGrid
            days={appointments.days}
            today={appointments.today}
            selectedId={appointments.selected?.id ?? null}
            onSelect={appointments.select}
          />
        )}
        <ColorLegend />
      </Card>
      <aside className="flex flex-col gap-6">
        {isMonth ? (
          <>
            <DayList appointments={appointments} />
            <MonthSummary appointments={appointments} />
          </>
        ) : appointments.selected ? (
          <AppointmentDetail
            appointment={appointments.selected}
            actions={actionsFor(
              appointments.selected,
              renderActions,
              appointments.now,
            )}
          />
        ) : (
          <Card>
            <p className="type-body-sm text-text-muted">{t("nothingInView")}</p>
          </Card>
        )}
        <AppointmentRequestsPanel
          groups={appointments.requestGroups}
          isOpen={appointments.isGroupOpen}
          onToggle={appointments.toggleGroup}
          selectedId={appointments.selected?.id ?? null}
          onSelect={appointments.focus}
          onShowList={appointments.showInList}
        />
      </aside>
    </div>
  );
}

function AppointmentDetail({
  appointment,
  actions,
}: {
  appointment: Appointment;
  actions: ReactNode;
}) {
  const t = useTranslations("iaStudent.appointments.calendar");
  const tList = useTranslations("iaStudent.appointments");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  const proposed =
    appointment.status === AppointmentStatus.AlternativeProposed
      ? offeredTimes(appointment)
      : [];
  const shown = proposed.length > 0 ? proposed : [appointment];
  const name = [appointment.counterpart.title, appointment.counterpart.fullName]
    .filter(Boolean)
    .join(" ");
  return (
    <Card labelledBy="appointment-detail-title">
      <div className="flex flex-wrap gap-2">
        <ProgramTypeBadge type={KIND_PROGRAM_TYPE[appointment.kind]} />
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <h2
        id="appointment-detail-title"
        className="mt-4 type-h4 break-words text-text-primary"
      >
        {appointment.category
          ? tTopic(appointment.category)
          : appointment.topic}
      </h2>
      <p className="mt-3 flex items-center gap-2 type-label text-text-primary">
        <ProfilePictureLink
          href={appointmentProfileHref(appointment)}
          name={appointment.counterpart.fullName}
        >
          <InitialsAvatar name={appointment.counterpart.fullName} size="sm" />
        </ProfilePictureLink>
        {name}
      </p>
      <div
        className={`mt-4 rounded-2xl px-4 py-3 ${
          proposed.length > 0
            ? "bg-status-info-bg text-status-info-text"
            : "bg-background-subtle text-text-primary"
        }`}
      >
        <p className="type-caption">
          {proposed.length > 0 ? t("proposedTime") : t("time")}
        </p>
        {shown.map((time) => (
          <p key={time.startsAt} className="type-label-lg">
            {`${formatDayMonth(new Date(time.startsAt), locale)} · ${timeLabel(time.startsAt, locale)} – ${timeLabel(time.endsAt, locale)}`}
          </p>
        ))}
      </div>
      {appointment.counterpartMessage ? (
        <p className="mt-3 type-body-sm break-words text-text-secondary">
          {tList("counterpartMessage", {
            message: appointment.counterpartMessage,
          })}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-4 flex flex-wrap gap-3">{actions}</div>
      ) : null}
    </Card>
  );
}

/** "Seçili gün" rows take their kind's tint with a bar in its colour (Figma 258:4684). */
const DAY_ROW_TONE: Record<AppointmentKind, { row: string; bar: string }> = {
  [AppointmentKind.OfficeHours]: {
    row: "bg-status-info-bg",
    bar: "bg-status-info-icon",
  },
  [AppointmentKind.PeerMentoring]: {
    row: "bg-brand-mentee-bg",
    bar: "bg-action-primary-bg",
  },
};

function MonthSummary({
  appointments,
}: {
  appointments: StudentAppointmentsModel;
}) {
  const t = useTranslations("iaStudent.appointments.calendar.summary");
  const locale = useLocale();
  const summary = appointments.monthSummary;
  if (!summary) return null;
  return (
    <section
      aria-labelledby="appointments-month-summary"
      className="flex flex-col gap-1.5"
    >
      <h2
        id="appointments-month-summary"
        className="type-label text-text-primary"
      >
        {t("title", { month: monthName(appointments.anchor, locale) })}
      </h2>
      <p className="type-body-sm text-text-secondary">{t("body", summary)}</p>
    </section>
  );
}

function DayList({ appointments }: { appointments: StudentAppointmentsModel }) {
  const t = useTranslations("iaStudent.appointments.calendar");
  const tKind = useTranslations("iaStudent.common.kind");
  const locale = useLocale();
  return (
    <Card labelledBy="appointments-day-title">
      <h2
        id="appointments-day-title"
        className="type-title-card text-text-primary"
      >
        {selectedDayTitle(appointments.selectedDay, locale)}
      </h2>
      {appointments.selectedDayItems.length === 0 ? (
        <p className="mt-3 type-body-sm text-text-muted">{t("emptyDay")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {appointments.selectedDayItems.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl p-3 ${DAY_ROW_TONE[item.kind].row}`}
            >
              <span
                aria-hidden
                className={`h-10 w-1 shrink-0 rounded-sm ${DAY_ROW_TONE[item.kind].bar}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="type-label break-words text-text-primary">
                  {`${timeLabel(currentTime(item).startsAt, locale)} · ${item.topic}`}
                </p>
                <p className="type-caption text-text-secondary">
                  {`${shortPersonName(item.counterpart.fullName)} · ${tKind(item.kind)}`}
                </p>
              </div>
              <AppointmentStatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** "Renkler" under the grid (Figma 258:4065): what each colour and the dashed frame stand for, side by side. */
function ColorLegend() {
  const t = useTranslations("iaStudent.appointments.colors");
  return (
    <Card compact labelledBy="appointments-colors" className="mt-4">
      <h3 id="appointments-colors" className="sr-only">
        {t("title")}
      </h3>
      <ul className="grid gap-3 sm:grid-cols-3">
        {Object.values(AppointmentKind).map((kind) => (
          <LegendRow
            key={kind}
            swatch={kindSwatch(kind, false)}
            title={t(`${kind}.title`)}
            body={t(`${kind}.body`)}
          />
        ))}
        <LegendRow
          swatch="border border-dashed border-border-strong"
          title={t("dashed.title")}
          body={t("dashed.body")}
        />
      </ul>
    </Card>
  );
}

function LegendRow({
  swatch,
  title,
  body,
}: {
  swatch: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className={`size-4 shrink-0 rounded ${swatch}`} />
      <span className="flex min-w-0 flex-col">
        <span className="type-label text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{body}</span>
      </span>
    </li>
  );
}
