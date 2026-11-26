"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { GateBadgeTag } from "@/components/badges/gate-badge-tag";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InfoBanner } from "@/components/ia/info-banner";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { SearchInput } from "@/components/ia/search-input";
import { useAdminStudents } from "@/hooks/use-admin-students";
import { StudentFilter } from "@/interfaces/badges";
import { errorMessage, formatLongDate } from "@/lib/utils";

type Students = ReturnType<typeof useAdminStudents>;

/**
 * Kullanıcılar › Öğrenciler (Figma 152:7525): everyone in a peer program, with a "Rozet durumu" filter and a search.
 * Awarding and taking back happen in the program's Katılımcılar, which the row links to.
 */
export function AdminStudentsTable() {
  const t = useTranslations("adminStudents");
  const students = useAdminStudents();
  const filterOptions = Object.values(StudentFilter).map((value) => ({
    value,
    label: value === StudentFilter.All ? t("filterAll") : t(`filters.${value}`),
  }));

  return (
    <div className="space-y-7">
      <InfoBanner>{t("intro")}</InfoBanner>
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          value={students.search}
          onChange={students.setSearch}
          className="w-full sm:w-80"
        />
        <ChipSelect
          label={t("filterLabel")}
          value={students.filter}
          options={filterOptions}
          onChange={students.setFilter}
        />
      </div>
      <StudentsBody students={students} />
      <Footnote>{t("footnote")}</Footnote>
    </div>
  );
}

function StudentsBody({ students }: { students: Students }) {
  const t = useTranslations("adminStudents");
  const locale = useLocale();
  if (students.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (students.error) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {errorMessage(students.error, t("loadFailed"))}
      </p>
    );
  }
  if (students.rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
        {t("empty")}
      </p>
    );
  }
  return (
    <DataTable
      caption={t("caption")}
      columns={[
        { key: "name", label: t("name"), className: "w-[300px]" },
        { key: "program", label: t("program"), className: "w-[260px]" },
        { key: "badge", label: t("badge"), className: "w-[200px]" },
        { key: "since", label: t("since") },
      ]}
    >
      {students.rows.map((row) => (
        <tr key={`${row.userId}-${row.programId}`}>
          <DataCell rowHeader>
            <span className="flex items-center gap-1.5">
              <InitialsAvatar name={row.fullName} />
              <span className="min-w-0">
                <span className="block">{row.fullName}</span>
                <span className="block type-caption text-text-muted">
                  {row.email}
                </span>
              </span>
            </span>
          </DataCell>
          <DataCell>
            <Link
              href={`/admin/programs/${encodeURIComponent(row.programId)}/students`}
              className="text-text-link hover:underline"
            >
              {row.programName}
            </Link>
          </DataCell>
          <DataCell>
            <GateBadgeTag row={row} />
          </DataCell>
          <DataCell className="text-text-secondary">
            {row.awardedAt ? formatLongDate(row.awardedAt, locale) : "—"}
          </DataCell>
        </tr>
      ))}
    </DataTable>
  );
}
