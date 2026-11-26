"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useId } from "react";

import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { ProgramLifecyclePill } from "@/components/ia/program-status-pill";
import { ProgramKindBadges } from "@/components/ia/program-type-badge";
import { StatusTone } from "@/components/ia/status-badge";
import { UnderlineTabs } from "@/components/ia/underline-tabs";
import { useSemesterLaunch } from "@/hooks/use-coordinator-program";
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
import { errorMessage } from "@/lib/utils";

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
            <ProgramKindBadges program={program} />
            <ProgramLifecyclePill lifecycle={program.lifecycle}>
              {t(`lifecycle.${program.lifecycle}`)}
            </ProgramLifecyclePill>
          </div>
          <p className="type-body text-text-secondary">
            {odtuProgramHeaderLine(detail, t, locale)}
          </p>
        </div>
        {navigation.admin ? (
          program.lifecycle === ProgramLifecycle.Draft ? (
            <LaunchAction
              programId={programId}
              program={program}
              hasCoordinator={detail.coordinators.length > 0}
            />
          ) : null
        ) : (
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

/** The admin's "Programı Başlat" in a draft's header (Figma 152:7447), closed until a coordinator is assigned. */
function LaunchAction({
  programId,
  program,
  hasCoordinator,
}: {
  programId: string;
  program: CoordinatorProgramDetail["program"];
  hasCoordinator: boolean;
}) {
  const t = useTranslations("coordinatorPrograms");
  const launch = useSemesterLaunch(programId, program);
  const hintId = useId();
  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        onClick={launch.ask}
        disabled={!hasCoordinator || launch.launching}
        aria-describedby={hasCoordinator ? undefined : hintId}
      >
        {launch.launching ? t("launching") : t("launchProgram")}
      </Button>
      {hasCoordinator ? null : (
        <p id={hintId} className="type-caption text-text-muted">
          {t("launchNeedsCoordinator")}
        </p>
      )}
      {launch.confirming ? (
        <LaunchDialog program={program} launch={launch} />
      ) : null}
    </div>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function LaunchDialog({
  program,
  launch,
}: {
  program: CoordinatorProgramDetail["program"];
  launch: ReturnType<typeof useSemesterLaunch>;
}) {
  const t = useTranslations("coordinatorPrograms.launchDialog");
  const titleId = useId();
  const preview = launch.preview;
  return (
    <ModalDialog labelledBy={titleId} onClose={launch.close}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t("title", { name: program.name })}
      </h2>
      {launch.previewLoading ? (
        <p role="status" className="type-body-sm text-text-muted">
          {t("loading")}
        </p>
      ) : null}
      {launch.previewError ? (
        <InlineAlert tone={StatusTone.Error}>
          {errorMessage(launch.previewError, t("loadFailed"))}
        </InlineAlert>
      ) : null}
      {preview ? (
        <ul className="list-disc space-y-2 pl-5 type-body-sm text-text-secondary">
          {preview.previous ? (
            <>
              <li>{t("completes", { previous: preview.previous.name })}</li>
              <li>
                {t("moves", {
                  students: preview.students,
                  peerMentors: preview.peerMentors,
                })}
              </li>
              <li>{t("keeps")}</li>
            </>
          ) : (
            <li>{t("noPrevious")}</li>
          )}
          {launch.officeHours ? <li>{t("officeHours")}</li> : null}
        </ul>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant={ButtonVariant.Ghost}
          onClick={launch.close}
          disabled={launch.launching}
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={launch.confirm}
          disabled={!launch.canConfirm || launch.launching}
        >
          {t("confirm")}
        </Button>
      </div>
    </ModalDialog>
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
