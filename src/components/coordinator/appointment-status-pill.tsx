import { useTranslations } from "next-intl";

import { StatusTone } from "@/components/ia/status-badge";
import { StatusPill } from "@/components/ia/status-pill";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";

const PILLS: Record<
  OfficeHoursRequestStatus,
  { tone: StatusTone; icon: string }
> = {
  [OfficeHoursRequestStatus.Pending]: {
    tone: StatusTone.Warning,
    icon: "/ia/icons/hourglass.svg",
  },
  [OfficeHoursRequestStatus.MoreInfoRequested]: {
    tone: StatusTone.Warning,
    icon: "/ia/icons/hourglass.svg",
  },
  [OfficeHoursRequestStatus.CounterProposed]: {
    tone: StatusTone.Info,
    icon: "/ia/icons/time.svg",
  },
  [OfficeHoursRequestStatus.Accepted]: {
    tone: StatusTone.Success,
    icon: "/ia/icons/check-circle.svg",
  },
  [OfficeHoursRequestStatus.Declined]: {
    tone: StatusTone.Error,
    icon: "/ia/icons/close-circle.svg",
  },
  [OfficeHoursRequestStatus.Withdrawn]: {
    tone: StatusTone.Neutral,
    icon: "/ia/icons/info.svg",
  },
  [OfficeHoursRequestStatus.Cancelled]: {
    tone: StatusTone.Neutral,
    icon: "/ia/icons/info.svg",
  },
  [OfficeHoursRequestStatus.Expired]: {
    tone: StatusTone.Neutral,
    icon: "/ia/icons/info.svg",
  },
};

/** An office-hours appointment's status as the Figma "Status Pill" ("Onay Bekliyor", "Onaylandı"…). */
export function AppointmentStatusPill({
  status,
}: {
  status: OfficeHoursRequestStatus;
}) {
  const t = useTranslations("programAppointments.status");
  const pill = PILLS[status];
  return (
    <StatusPill tone={pill.tone} icon={pill.icon}>
      {t(status)}
    </StatusPill>
  );
}
