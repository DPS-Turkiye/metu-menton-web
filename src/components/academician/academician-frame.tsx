"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { RoleFrame, type RoleNavItem } from "@/components/common/role-frame";
import { Workspace } from "@/interfaces/workspace";
import { ACADEMICIAN_ROUTES } from "@/lib/academician-routes";

const NAV: RoleNavItem[] = [
  {
    href: ACADEMICIAN_ROUTES.home,
    label: "home",
    icon: "/ia/nav/home.svg",
    match: (path) => path === ACADEMICIAN_ROUTES.home,
  },
  {
    href: ACADEMICIAN_ROUTES.appointments,
    label: "myAppointments",
    icon: "/ia/nav/calendar.svg",
    // A student's profile is opened from a request, so it stays under Randevularım as in the design.
    match: (path) =>
      path.startsWith(ACADEMICIAN_ROUTES.appointments) ||
      path.startsWith(ACADEMICIAN_ROUTES.students),
  },
  {
    href: ACADEMICIAN_ROUTES.advisees,
    label: "advisees",
    icon: "/ia/nav/group.svg",
    match: (path) => path.startsWith(ACADEMICIAN_ROUTES.advisees),
  },
  {
    href: ACADEMICIAN_ROUTES.profile,
    label: "myProfile",
    icon: "/ia/nav/user.svg",
    match: (path) => path.startsWith(ACADEMICIAN_ROUTES.profile),
  },
];

export function AcademicianFrame({ children }: { children: ReactNode }) {
  const t = useTranslations("roleFrame.workspace");
  return (
    <RoleFrame
      workspace={Workspace.OdtuAcademician}
      homeHref={ACADEMICIAN_ROUTES.home}
      menuLabel="academicianMenu"
      nav={NAV}
      roleLabel={t("academician")}
    >
      {children}
    </RoleFrame>
  );
}
