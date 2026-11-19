import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Clock,
  History,
  Hourglass,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { AppointmentStatusBadge } from "@/components/student/ia/ui";
import type { Appointment } from "@/interfaces/appointment";
import { titledName } from "@/lib/profile-completion";
import {
  REQUEST_GROUP_PREVIEW,
  requestGroupListTab,
  requestRowTime,
  wasHeld,
} from "@/lib/student-appointments";
import {
  AppointmentRequestGroup,
  AppointmentsTab,
} from "@/types/student-appointments";

const GROUPS = Object.values(AppointmentRequestGroup);

const GROUP_ICON: Record<
  AppointmentRequestGroup,
  { icon: LucideIcon; className: string }
> = {
  [AppointmentRequestGroup.AwaitingYou]: {
    icon: Clock,
    className: "text-status-info-icon",
  },
  [AppointmentRequestGroup.AwaitingThem]: {
    icon: Hourglass,
    className: "text-status-warning-icon",
  },
  [AppointmentRequestGroup.Confirmed]: {
    icon: CircleCheck,
    className: "text-status-success-icon",
  },
  [AppointmentRequestGroup.Past]: {
    icon: History,
    className: "text-icon-default",
  },
};

/** The two request groups explain who answers next; the others read on their own. */
function hintKey(group: AppointmentRequestGroup) {
  switch (group) {
    case AppointmentRequestGroup.AwaitingYou:
      return "hints.awaitingYou" as const;
    case AppointmentRequestGroup.AwaitingThem:
      return "hints.awaitingThem" as const;
    case AppointmentRequestGroup.Confirmed:
    case AppointmentRequestGroup.Past:
      return null;
  }
}

export type AppointmentRequestsPanelProps = {
  groups: Record<AppointmentRequestGroup, Appointment[]>;
  isOpen: (group: AppointmentRequestGroup) => boolean;
  onToggle: (group: AppointmentRequestGroup) => void;
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
  onShowList: (tab: AppointmentsTab) => void;
};

/**
 * Taleplerim beside the calendar (Figma 258:3698): the student's appointments in four groups that open and close
 * on their heading. A row opens the session in the side panel; "Liste" and "listede gör" switch to the list view.
 */
export function AppointmentRequestsPanel({
  groups,
  isOpen,
  onToggle,
  selectedId,
  onSelect,
  onShowList,
}: AppointmentRequestsPanelProps) {
  const t = useTranslations("iaStudent.appointments.requests");
  return (
    <Card labelledBy="appointment-requests-title">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2
          id="appointment-requests-title"
          className="type-title-card text-text-primary"
        >
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={() => onShowList(AppointmentsTab.Requests)}
          className="inline-flex items-center gap-1 type-label-sm text-text-link hover:underline"
        >
          {t("list")}
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      </div>
      {GROUPS.map((group) => (
        <RequestGroup
          key={group}
          group={group}
          items={groups[group]}
          open={isOpen(group)}
          onToggle={() => onToggle(group)}
          selectedId={selectedId}
          onSelect={onSelect}
          onShowList={onShowList}
        />
      ))}
    </Card>
  );
}

function RequestGroup({
  group,
  items,
  open,
  onToggle,
  selectedId,
  onSelect,
  onShowList,
}: {
  group: AppointmentRequestGroup;
  items: Appointment[];
  open: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
  onShowList: (tab: AppointmentsTab) => void;
}) {
  const t = useTranslations("iaStudent.appointments.requests");
  const { icon: Icon, className: iconClass } = GROUP_ICON[group];
  const hint = hintKey(group);
  const listTab = requestGroupListTab(group, items.length);
  const headerId = `appointment-requests-${group}`;
  const panelId = `${headerId}-panel`;
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <div className="border-t border-border-subtle">
      <h3>
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-12 w-full items-center gap-2 py-3 text-left focus-visible:outline-2 focus-visible:outline-border-selected"
        >
          <Icon
            aria-hidden
            className={`size-5 shrink-0 ${iconClass}`}
            strokeWidth={1.5}
          />
          <span className="flex-1 type-label text-text-primary">
            {t(`groups.${group}`)}
          </span>
          <span className="sr-only">{t("count", { count: items.length })}</span>
          <span
            aria-hidden
            className={`rounded-full px-2 py-0.5 type-label-sm ${
              group === AppointmentRequestGroup.AwaitingYou
                ? "bg-status-info-bg text-status-info-text"
                : "bg-background-muted text-text-secondary"
            }`}
          >
            {items.length}
          </span>
          <Chevron
            aria-hidden
            className="size-5 shrink-0 text-icon-default"
            strokeWidth={1.5}
          />
        </button>
      </h3>
      {/* Kept in the DOM while closed, so the heading's aria-controls always points at it. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        className="flex flex-col gap-2 pb-4"
      >
        {hint ? (
          <p className="flex items-center gap-1 type-caption text-text-secondary">
            <Info
              aria-hidden
              className="size-4 shrink-0 text-icon-muted"
              strokeWidth={1.5}
            />
            {t(hint)}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="type-caption text-text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.slice(0, REQUEST_GROUP_PREVIEW).map((item) => (
              <li key={item.id}>
                <RequestRow
                  appointment={item}
                  group={group}
                  selected={selectedId === item.id}
                  onSelect={() => onSelect(item)}
                />
              </li>
            ))}
          </ul>
        )}
        {listTab ? (
          <button
            type="button"
            onClick={() => onShowList(listTab)}
            className="inline-flex w-fit items-center gap-1 type-label-sm text-text-link hover:underline"
          >
            {t(`seeInList.${listTab}`)}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Figma "Taleplerim / Satır": a date tile, who and when; the student's own answer is tinted (Tone=Aksiyon). */
function RequestRow({
  appointment,
  group,
  selected,
  onSelect,
}: {
  appointment: Appointment;
  group: AppointmentRequestGroup;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("iaStudent.appointments.requests");
  const tKind = useTranslations("iaStudent.common.kind");
  const locale = useLocale();
  const { tile, when: hours } = requestRowTime(appointment, group, locale);
  const isAction = group === AppointmentRequestGroup.AwaitingYou;
  const isPast = group === AppointmentRequestGroup.Past;
  const when = `${hours} · ${tKind(appointment.kind)}`;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-border-selected ${
        isAction
          ? "border border-status-info-border bg-status-info-bg"
          : "bg-background-subtle hover:bg-background-muted"
      } ${selected ? "ring-2 ring-border-selected" : ""}`}
    >
      <span className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-background-elevated">
        <span className="type-title-card text-text-primary">{tile.day}</span>
        <span className="type-overline text-text-secondary">{tile.month}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="type-label break-words text-text-primary">
          {titledName(
            appointment.counterpart.title,
            appointment.counterpart.fullName,
          )}
        </span>
        <span className="type-caption break-words text-text-secondary">
          {isAction ? t("proposed", { time: when }) : when}
        </span>
        {isPast ? <PastStatus appointment={appointment} /> : null}
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-icon-default"
        strokeWidth={1.5}
      />
    </button>
  );
}

/** Geçmiş mixes outcomes, so each row says its own. */
function PastStatus({ appointment }: { appointment: Appointment }) {
  const t = useTranslations("iaStudent.appointments.requests");
  if (!wasHeld(appointment)) {
    return <AppointmentStatusBadge status={appointment.status} />;
  }
  return (
    <StatusBadge
      tone={StatusTone.Neutral}
      icon={<Check aria-hidden className="size-4" strokeWidth={1.5} />}
    >
      {t("held")}
    </StatusBadge>
  );
}
