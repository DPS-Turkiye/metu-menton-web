"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useId } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { ChipSelect } from "@/components/ia/filter-chip";
import { InlineAlert } from "@/components/ia/inline-alert";
import { PageHeader } from "@/components/ia/page-header";
import { ProgramLifecyclePill } from "@/components/ia/program-status-pill";
import { ProgramTypeBadge } from "@/components/ia/program-type-badge";
import { SegmentedControl } from "@/components/ia/segmented-tabs";
import { StatusTone } from "@/components/ia/status-badge";
import {
  useOdtuCoordinatorPrograms,
  type ProgramCardData,
} from "@/hooks/use-odtu-coordinator-programs";
import { errorMessage } from "@/lib/utils";

type Programs = ReturnType<typeof useOdtuCoordinatorPrograms>;

/** The ODTÜ coordinator's Programlarım (Figma 152:7749). */
export function OdtuProgramsListView() {
  const t = useTranslations("odtuCoordinatorPrograms");
  const programs = useOdtuCoordinatorPrograms();
  return (
    <div className="space-y-7">
      <PageHeader
        title={t("title")}
        actions={
          programs.loaded ? (
            <>
              <SegmentedControl
                label={t("segmentsLabel")}
                segments={programs.segments}
                onSelect={programs.setSegment}
              />
              <ChipSelect
                label={t("typeLabel")}
                value={programs.type}
                options={programs.typeOptions}
                onChange={programs.setType}
              />
            </>
          ) : null
        }
      >
        <p className="type-body text-text-secondary">
          {t("subtitle", { count: programs.total })}
        </p>
      </PageHeader>
      {programs.drafts ? (
        <InlineAlert
          tone={StatusTone.Warning}
          title={t("draftsTitle")}
          className="bg-status-warning-bg"
        >
          {t("draftsBody", { names: programs.drafts })}
        </InlineAlert>
      ) : null}
      <ProgramsBody programs={programs} />
    </div>
  );
}

function ProgramsBody({ programs }: { programs: Programs }) {
  const t = useTranslations("odtuCoordinatorPrograms");
  if (programs.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (programs.loadError) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {errorMessage(programs.loadError, t("loadFailed"))}
      </p>
    );
  }
  if (programs.cards.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
        {programs.total > 0 ? t("noMatch") : t("none")}
      </p>
    );
  }
  return (
    <ul className="grid gap-5 lg:grid-cols-2">
      {programs.cards.map((card) => (
        <li key={card.program.id}>
          <ProgramCard card={card} />
        </li>
      ))}
    </ul>
  );
}

function ProgramCard({ card }: { card: ProgramCardData }) {
  const t = useTranslations("odtuCoordinatorPrograms");
  const tLifecycle = useTranslations("coordinatorPrograms.lifecycle");
  const titleId = useId();
  const { program } = card;
  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col gap-[18px] rounded-[20px] border border-border-subtle bg-background-surface p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <ProgramTypeBadge type={program.type} />
        <ProgramLifecyclePill lifecycle={program.lifecycle}>
          {tLifecycle(program.lifecycle)}
        </ProgramLifecyclePill>
      </div>
      <div className="space-y-1">
        <h2 id={titleId} className="type-h3 text-text-primary">
          {program.name}
        </h2>
        <p className="flex items-center gap-1.5 type-body-sm text-text-secondary">
          <Image
            alt=""
            src="/ia/icons/calendar-small.svg"
            width={14}
            height={14}
          />
          {card.dateLine}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {card.stats.map((stat) => (
          <div
            key={stat.key}
            className="flex min-w-0 flex-col-reverse gap-0.5 rounded-[14px] bg-background-subtle p-3.5"
          >
            <dt className="truncate type-caption text-text-muted">
              {stat.label}
            </dt>
            <dd className="type-metric-sm text-text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex justify-end">
        <Button
          href={card.href}
          size={ButtonSize.Small}
          variant={card.draft ? ButtonVariant.Primary : ButtonVariant.Secondary}
        >
          {card.draft ? t("settings") : t("open")}
        </Button>
      </div>
    </article>
  );
}
