"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { ProgramTypeBadge } from "@/components/ia/program-type-badge";
import { StatusTone } from "@/components/ia/status-badge";
import { STATUS_DOT_ICON, StatusPill } from "@/components/ia/status-pill";
import { UnderlineTabs } from "@/components/ia/underline-tabs";
import { useProgramNavigation } from "@/hooks/use-program-navigation";
import { useProgramSwitcher } from "@/hooks/use-program-switcher";
import {
  ProgramLifecycle,
  type CoordinatorProgramDetail,
} from "@/interfaces/coordinator-program";
import {
  isActiveTab,
  odtuProgramHeaderLine,
  odtuProgramTabs,
  type ProgramTab,
} from "@/lib/coordinator-program-detail";

const LIFECYCLE_PILLS: Record<
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
    icon: "/ia/icons/check.svg",
  },
};

/** A program's lifecycle as the Figma "Status Pill" (Aktif, Taslak…). */
export function ProgramLifecyclePill({
  lifecycle,
}: {
  lifecycle: ProgramLifecycle;
}) {
  const t = useTranslations("coordinatorPrograms");
  const pill = LIFECYCLE_PILLS[lifecycle];
  return (
    <StatusPill tone={pill.tone} icon={pill.icon}>
      {t(`lifecycle.${lifecycle}`)}
    </StatusPill>
  );
}

/**
 * The ODTÜ program header (Figma 06 — Koordinatör, "Program Detayı"): the breadcrumb, the name with its type and
 * status, the dates and coordinators, the program picker, and the tab row.
 */
export function OdtuProgramHeader({
  detail,
  programId,
  tab,
  tabCounts,
}: {
  detail: CoordinatorProgramDetail;
  programId: string;
  tab: ProgramTab;
  tabCounts?: Partial<Record<ProgramTab, number | null>> | undefined;
}) {
  const t = useTranslations("coordinatorPrograms");
  const tNav = useTranslations("roleFrame.nav");
  const locale = useLocale();
  const navigation = useProgramNavigation(programId);
  const program = detail.program;
  const tabs = odtuProgramTabs(detail, programId).map((item) => ({
    id: item.id,
    label: t(`tabs.${item.id}`),
    href: item.href ? navigation.resolveHref(item.href) : null,
    count: tabCounts?.[item.id] ?? item.count,
    active: isActiveTab(item.id, tab),
  }));

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2.5">
          <nav
            aria-label={t("breadcrumb")}
            className="type-caption text-text-muted"
          >
            <Link
              href={navigation.listHref}
              className="hover:text-text-primary"
            >
              {navigation.admin ? tNav("programs") : t("myPrograms")}
            </Link>{" "}
            / <span aria-current="page">{program.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="type-h1 text-text-primary">{program.name}</h1>
            <ProgramTypeBadge type={program.type} />
            <ProgramLifecyclePill lifecycle={program.lifecycle} />
          </div>
          <p className="type-body text-text-secondary">
            {odtuProgramHeaderLine(detail, t, locale)}
          </p>
        </div>
        {navigation.admin ? null : (
          <ProgramSwitcher programId={programId} programName={program.name} />
        )}
      </header>
      <UnderlineTabs
        label={t("sections")}
        tabs={tabs}
        disabledTitle={t("soon")}
      />
    </div>
  );
}

function ProgramSwitcher({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const t = useTranslations("coordinatorPrograms");
  const switcher = useProgramSwitcher(programId, programName);
  return (
    <span className="relative inline-flex items-center gap-2 rounded-full border border-border-default px-4 py-2.5 focus-within:ring-[3px] focus-within:ring-border-default">
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-status-success-icon"
      />
      <span aria-hidden className="type-body-sm text-text-muted">
        {t("switcherLabel")}
      </span>
      <span aria-hidden className="type-label text-text-primary">
        {programName}
      </span>
      <Image alt="" src="/ia/icons/chevron-down.svg" width={16} height={16} />
      <select
        aria-label={t("switcherAria")}
        value={programId}
        onChange={(event) => switcher.switchTo(event.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
      >
        {switcher.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
