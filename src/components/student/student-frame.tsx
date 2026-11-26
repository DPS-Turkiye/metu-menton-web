"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { RoleFrame, type RoleNavItem } from "@/components/common/role-frame";
import { IskurMessagesMenu } from "@/components/iskur/iskur-messages-menu";
import { useStudentFeatures } from "@/hooks/use-student-features";
import { Workspace } from "@/interfaces/workspace";
import {
  STUDENT_OFFICE_HOURS_HREF,
  STUDENT_PEER_MENTORING_HREF,
} from "@/lib/student-features";
import { studentNotificationHref } from "@/lib/student-notification-href";

export const STUDENT_HOME = "/student";

/** The ODTÜ student's workspace menu (Figma "Nav / Öğrenci"); the frame itself comes from the IA kit. */
export const STUDENT_NAV: RoleNavItem[] = [
  {
    href: STUDENT_HOME,
    label: "home",
    icon: "/ia/nav/home.svg",
    match: (path) => path === STUDENT_HOME,
  },
  {
    href: STUDENT_PEER_MENTORING_HREF,
    label: "peerMentoring",
    icon: "/ia/nav/group.svg",
    match: (path) => path.startsWith(STUDENT_PEER_MENTORING_HREF),
  },
  {
    href: STUDENT_OFFICE_HOURS_HREF,
    label: "officeHours",
    icon: "/ia/nav/academic.svg",
    match: (path) => path.startsWith(STUDENT_OFFICE_HOURS_HREF),
  },
  {
    href: "/student/appointments",
    label: "myAppointments",
    icon: "/ia/nav/calendar.svg",
    match: (path) => path.startsWith("/student/appointments"),
  },
  {
    href: "/student/profile",
    label: "myProfile",
    icon: "/ia/nav/user.svg",
    match: (path) => path.startsWith("/student/profile"),
  },
];

export function StudentFrame({ children }: { children: ReactNode }) {
  const t = useTranslations("roleFrame.workspace");
  const features = useStudentFeatures();
  return (
    <RoleFrame
      workspace={Workspace.OdtuStudent}
      homeHref={STUDENT_HOME}
      menuLabel="studentMenu"
      nav={features.visible(STUDENT_NAV)}
      roleLabel={t("student")}
      headerExtras={<IskurMessagesMenu />}
      notificationHref={studentNotificationHref}
    >
      {children}
    </RoleFrame>
  );
}
