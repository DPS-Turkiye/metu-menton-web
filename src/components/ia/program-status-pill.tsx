import type { ReactNode } from "react";

import { StatusTone } from "@/components/ia/status-badge";
import { STATUS_DOT_ICON, StatusPill } from "@/components/ia/status-pill";
import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { ProgramStatus } from "@/interfaces/program";

const LIFECYCLE_LOOKS: Record<
  ProgramLifecycle,
  { tone: StatusTone; icon: string }
> = {
  [ProgramLifecycle.Draft]: {
    tone: StatusTone.Neutral,
    icon: "/ia/icons/edit.svg",
  },
  [ProgramLifecycle.Active]: {
    tone: StatusTone.Success,
    icon: STATUS_DOT_ICON,
  },
  [ProgramLifecycle.Upcoming]: {
    tone: StatusTone.Info,
    icon: "/ia/icons/time.svg",
  },
  [ProgramLifecycle.Completed]: {
    tone: StatusTone.Neutral,
    icon: "/ia/icons/status-check.svg",
  },
};

const STATUS_LIFECYCLE: Record<ProgramStatus, ProgramLifecycle> = {
  [ProgramStatus.Draft]: ProgramLifecycle.Draft,
  [ProgramStatus.Active]: ProgramLifecycle.Active,
  [ProgramStatus.Completed]: ProgramLifecycle.Completed,
};

/** A program's lifecycle as the Figma "Status Pill" (Aktif, Taslak…); the caller names it. */
export function ProgramLifecyclePill({
  lifecycle,
  children,
}: {
  lifecycle: ProgramLifecycle;
  children: ReactNode;
}) {
  const look = LIFECYCLE_LOOKS[lifecycle];
  return (
    <StatusPill tone={look.tone} icon={look.icon}>
      {children}
    </StatusPill>
  );
}

/** The same pill for a program's stored status, where there is no lifecycle (the admin's list). */
export function ProgramStatusPill({
  status,
  children,
}: {
  status: ProgramStatus;
  children: ReactNode;
}) {
  return (
    <ProgramLifecyclePill lifecycle={STATUS_LIFECYCLE[status]}>
      {children}
    </ProgramLifecyclePill>
  );
}
