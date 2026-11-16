"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { AssignCoordinatorDialog } from "@/components/admin/assign-coordinator-dialog";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { ProgramStatusPill } from "@/components/ia/program-status-pill";
import { ProgramTypeBadge } from "@/components/ia/program-type-badge";
import { RowActionsMenu } from "@/components/ia/row-actions-menu";
import { SearchInput } from "@/components/ia/search-input";
import { SegmentedControl } from "@/components/ia/segmented-tabs";
import { StatusTone } from "@/components/ia/status-badge";
import { Tag } from "@/components/ia/tag";
import {
  useOdtuAdminPrograms,
  type AdminProgramRow,
} from "@/hooks/use-odtu-admin-programs";
import { errorMessage } from "@/lib/utils";

type Programs = ReturnType<typeof useOdtuAdminPrograms>;

/** The ODTÜ admin's Programlar (Figma 152:7056). Only the admin creates and starts programs. */
export function OdtuProgramsView() {
  const t = useTranslations("odtuAdminPrograms");
  const programs = useOdtuAdminPrograms();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        {programs.segments.length > 0 ? (
          <SegmentedControl
            label={t("statusLabel")}
            segments={programs.segments}
            onSelect={programs.setStatus}
          />
        ) : null}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <SearchInput
            label={t("searchLabel")}
            placeholder={t("searchLabel")}
            value={programs.search}
            onChange={programs.setSearch}
            className="w-60"
          />
          <ChipSelect
            label={t("typeLabel")}
            value={programs.type}
            options={programs.typeOptions}
            onChange={programs.setType}
          />
          <ChipSelect
            label={t("coordinatorLabel")}
            value={programs.coordinatorId}
            options={programs.coordinatorOptions}
            onChange={programs.setCoordinatorId}
          />
          <Button href="/admin/programs/new">
            <Image
              alt=""
              src="/ia/icons/add-inverse.svg"
              width={20}
              height={20}
            />
            {t("newProgram")}
          </Button>
        </div>
      </div>
      <ProgramsBody programs={programs} />
      <Footnote>{t("footnote")}</Footnote>
      {programs.assigning ? (
        <AssignCoordinatorDialog
          programId={programs.assigning.id}
          programName={programs.assigning.name}
          onClose={programs.stopAssigning}
        />
      ) : null}
    </div>
  );
}

function ProgramsBody({ programs }: { programs: Programs }) {
  const t = useTranslations("odtuAdminPrograms");
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
  if (programs.rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
        {programs.hasPrograms ? t("noMatch") : t("empty")}
      </p>
    );
  }
  return (
    <DataTable
      caption={t("caption")}
      columns={[
        { key: "program", label: t("columns.program"), className: "w-[300px]" },
        { key: "type", label: t("columns.type"), className: "w-[200px]" },
        { key: "status", label: t("columns.status"), className: "w-[120px]" },
        {
          key: "coordinator",
          label: t("columns.coordinator"),
          className: "w-[240px]",
        },
        { key: "date", label: t("columns.date"), className: "w-[220px]" },
        {
          key: "participants",
          label: t("columns.participants"),
          className: "w-[90px]",
        },
        {
          key: "actions",
          label: <span className="sr-only">{t("columns.actions")}</span>,
        },
      ]}
    >
      {programs.rows.map((row) => (
        <ProgramRow key={row.program.id} row={row} programs={programs} />
      ))}
    </DataTable>
  );
}

function ProgramRow({
  row,
  programs,
}: {
  row: AdminProgramRow;
  programs: Programs;
}) {
  const t = useTranslations("odtuAdminPrograms");
  const { program } = row;
  return (
    <tr className="hover:bg-background-hover">
      <DataCell rowHeader className="type-label">
        {program.name}
      </DataCell>
      <DataCell>
        <ProgramTypeBadge type={program.type} />
      </DataCell>
      <DataCell>
        <ProgramStatusPill status={program.status}>
          {t(`status.${program.status}`)}
        </ProgramStatusPill>
      </DataCell>
      <DataCell>
        {row.coordinators ? (
          <span className="flex items-center gap-2">
            <InitialsAvatar name={row.coordinators.leadName} />
            <span className="whitespace-nowrap">{row.coordinators.label}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Tag tone={StatusTone.Error}>{t("noCoordinator")}</Tag>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Small}
              onClick={() => programs.startAssigning(program)}
            >
              {t("assignCoordinator")}
            </Button>
          </span>
        )}
      </DataCell>
      <DataCell className="text-text-secondary">{row.date}</DataCell>
      <DataCell>{row.participants}</DataCell>
      <DataCell>
        <span className="flex items-center justify-end gap-2">
          <Button
            href={`/admin/programs/${program.id}`}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            aria-label={t("openLabel", { name: program.name })}
          >
            {t("open")}
          </Button>
          <RowActionsMenu
            label={t("rowActions", { name: program.name })}
            actions={[
              {
                id: "coordinator",
                label: row.coordinators
                  ? t("addCoordinator")
                  : t("assignCoordinator"),
                onSelect: () => programs.startAssigning(program),
              },
            ]}
          />
        </span>
      </DataCell>
    </tr>
  );
}
