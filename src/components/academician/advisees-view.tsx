"use client";

import { Info, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { AppointmentStatusBadge } from "@/components/academician/appointment-status-badge";
import { StudentAvatar } from "@/components/academician/student-avatar";
import { WorkspaceQueryState } from "@/components/academician/workspace-query-state";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { ChipSelect, ToggleChip } from "@/components/ia/filter-chip";
import { InlineAlert } from "@/components/ia/inline-alert";
import { PageHeader } from "@/components/ia/page-header";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import {
  useAcademicianAdvisees,
  type AcademicianAdvisees,
  type AdviseeTableRow,
} from "@/hooks/use-academician-advisees";

const COLUMNS = ["student", "program", "last", "next"] as const;

/** "Danışan Öğrencilerim" (Figma 10.7): ODTÜ's advisee list with each student's meetings, read-only. */
export function AdviseesView() {
  const t = useTranslations("iaAcademician.advisees");
  const { list, ...state } = useAcademicianAdvisees();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")}>
        <p className="type-body-lg text-text-secondary">{t("subtitle")}</p>
      </PageHeader>
      {list ? (
        <AdviseesContent list={list} />
      ) : (
        <WorkspaceQueryState
          isLoading={state.isLoading}
          error={state.error}
          onRetry={state.retry}
          isRetrying={state.isRetrying}
        />
      )}
    </div>
  );
}

function AdviseesContent({ list }: { list: AcademicianAdvisees }) {
  const t = useTranslations("iaAcademician.advisees");
  const tCommon = useTranslations("iaAcademician.common");
  if (list.total === 0) {
    return (
      <p className="rounded-2xl bg-background-subtle px-5 py-4 type-body-sm text-text-secondary">
        {t("empty")}
      </p>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-12 min-w-64 flex-1 items-center gap-3 rounded-input border border-border-control bg-background-surface px-4 focus-within:outline-2 focus-within:outline-border-selected sm:max-w-[360px]">
          <Search
            aria-hidden
            className="size-5 text-icon-muted"
            strokeWidth={1.5}
          />
          <span className="sr-only">{t("search")}</span>
          <input
            type="search"
            value={list.search}
            onChange={(event) => {
              list.setSearch(event.target.value);
            }}
            placeholder={t("search")}
            className="w-full bg-transparent type-body text-text-primary outline-none placeholder:text-text-placeholder"
          />
        </label>
        {list.classYears.length > 0 ? (
          <ChipSelect
            label={t("classYearFilter")}
            value={list.classYear === null ? "" : String(list.classYear)}
            options={[
              { value: "", label: t("classYearFilter") },
              ...list.classYears.map(({ year, label }) => ({
                value: String(year),
                label,
              })),
            ]}
            onChange={(value) => {
              list.setClassYear(value === "" ? null : Number(value));
            }}
          />
        ) : null}
        <ToggleChip
          label={t("upcomingOnly")}
          pressed={list.upcomingOnly}
          onToggle={list.toggleUpcomingOnly}
        />
        <p className="ml-auto type-body-sm text-text-muted">
          {t("count", { count: list.rows.length })}
        </p>
      </div>
      {list.meetings.failed ? (
        <InlineAlert tone={StatusTone.Warning} title={t("meetingsFailed")}>
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            disabled={list.meetings.isRetrying}
            onClick={list.meetings.retry}
            className="mt-2"
          >
            {tCommon("retry")}
          </Button>
        </InlineAlert>
      ) : null}
      {list.rows.length > 0 ? (
        <AdviseesTable rows={list.rows} />
      ) : (
        <p className="rounded-2xl bg-background-subtle px-5 py-4 type-body-sm text-text-secondary">
          {t("noMatch")}
        </p>
      )}
      <p className="flex items-start gap-2 type-body-sm text-text-muted">
        <Info
          aria-hidden
          className="mt-0.5 size-4 shrink-0"
          strokeWidth={1.5}
        />
        {t("footnote")}
      </p>
    </>
  );
}

function AdviseesTable({ rows }: { rows: AdviseeTableRow[] }) {
  const t = useTranslations("iaAcademician.advisees");
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default bg-background-surface">
      <table className="w-full min-w-[760px] text-left">
        <caption className="sr-only">
          {`${t("title")} · ${t("count", { count: rows.length })}`}
        </caption>
        <thead>
          <tr className="border-b border-border-default bg-background-subtle">
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-5 py-3 type-label-sm text-text-secondary"
              >
                {t(`columns.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {rows.map((row) => (
            <AdviseeRowView key={row.key} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdviseeRowView({ row }: { row: AdviseeTableRow }) {
  const t = useTranslations("iaAcademician.advisees");
  return (
    <tr>
      <th scope="row" className="px-5 py-3 font-normal">
        <span className="flex flex-wrap items-center gap-2.5">
          <StudentAvatar name={row.name} small />
          {row.href === null ? (
            <span className="type-label text-text-primary">{row.name}</span>
          ) : (
            <Link
              href={row.href}
              className="type-label text-text-primary hover:underline"
            >
              {row.name}
            </Link>
          )}
          {row.href === null ? (
            <StatusBadge tone={StatusTone.Neutral}>
              {t("notSignedIn")}
            </StatusBadge>
          ) : null}
        </span>
      </th>
      <td className="px-5 py-3 type-body-sm text-text-secondary">
        {row.detail}
      </td>
      <td className="px-5 py-3 type-body-sm text-text-secondary">
        {row.last ?? t("none")}
      </td>
      <td className="px-5 py-3 type-body-sm text-text-primary">
        {row.next ? (
          <span className="flex flex-wrap items-center gap-2">
            {row.next.label}
            <AppointmentStatusBadge status={row.next.status} />
          </span>
        ) : (
          t("none")
        )}
      </td>
    </tr>
  );
}
