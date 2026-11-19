// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { QueryNotice } from "@/components/admin/admin-ui";
import { ListPagination } from "@/components/common/list-pagination";
import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect, ToggleChip } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { SearchInput } from "@/components/ia/search-input";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { useProgramOfficeHoursStudents } from "@/hooks/use-program-office-hours-students";
import type { ProgramOfficeHoursStudentRow } from "@/interfaces/program-office-hours";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { formatMeetingShort } from "@/lib/format";
import {
  studentRequestCounts,
  type StudentRequestKind,
} from "@/lib/program-office-hours";
import { errorMessage } from "@/lib/utils";

/**
 * An Office Hours program's Katılımcılar › Öğrenciler: every student who asked for office hours lately, with how
 * their requests stand. No frame exists yet; it reuses the Randevular pieces.
 */
export function ProgramOhStudentsView({ programId }: { programId: string }) {
  const students = useProgramOfficeHoursStudents(programId);
  return (
    <ProgramDetailFrame programId={programId} tab={ProgramTab.Students}>
      {() => <StudentsBody students={students} />}
    </ProgramDetailFrame>
  );
}

function StudentsBody({
  students,
}: {
  students: ReturnType<typeof useProgramOfficeHoursStudents>;
}) {
  const t = useTranslations("programOhStudents");
  const locale = useLocale();
  const { data, filters } = students;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          label={t("searchLabel")}
          placeholder={t("searchLabel")}
          value={filters.search}
          onChange={students.setSearch}
          className="w-full sm:w-80"
        />
        <ChipSelect
          label={t("facultyLabel")}
          value={filters.faculty}
          options={students.facultyOptions}
          onChange={students.setFaculty}
        />
        <ToggleChip
          label={t("awaitingOnly")}
          pressed={filters.awaitingOnly}
          onToggle={students.toggleAwaitingOnly}
        />
      </div>

      {data && students.error ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {errorMessage(students.error, t("loadFailed"))}
        </p>
      ) : null}

      {data ? (
        data.students.content.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
            {t("empty")}
          </p>
        ) : (
          <div
            aria-busy={students.isUpdating}
            className={students.isUpdating ? "opacity-60" : ""}
          >
            <DataTable
              caption={t("caption")}
              columns={[
                {
                  key: "student",
                  label: t("columns.student"),
                  className: "w-[240px]",
                },
                {
                  key: "department",
                  label: t("columns.department"),
                  className: "w-[240px]",
                },
                {
                  key: "requests",
                  label: t("columns.requests"),
                  className: "w-[320px]",
                },
                {
                  key: "academicians",
                  label: t("columns.academicians"),
                  className: "w-[140px]",
                },
                { key: "last", label: t("columns.lastRequest") },
              ]}
            >
              {data.students.content.map((row) => (
                <tr key={row.id}>
                  <DataCell>
                    <span className="flex items-center gap-1.5">
                      <InitialsAvatar name={row.student.name} />
                      {row.student.name}
                    </span>
                  </DataCell>
                  <DataCell>
                    <DepartmentCell row={row} />
                  </DataCell>
                  <DataCell>
                    <RequestCounts row={row} />
                  </DataCell>
                  <DataCell>{row.academicians}</DataCell>
                  <DataCell>
                    {formatMeetingShort(row.lastRequestedAt, locale)}
                  </DataCell>
                </tr>
              ))}
            </DataTable>
            <ListPagination
              page={filters.page}
              totalPages={data.students.totalPages}
              onPageChange={students.setPage}
            />
          </div>
        )
      ) : (
        <QueryNotice isLoading={students.isLoading} error={students.error} />
      )}

      <Footnote>{t("footnote")}</Footnote>
    </div>
  );
}

function DepartmentCell({ row }: { row: ProgramOfficeHoursStudentRow }) {
  const t = useTranslations("programOhStudents");
  const department = row.student.department;
  if (!department) return <span className="text-text-muted">{t("none")}</span>;
  return row.classYear !== null ? (
    <>{t("departmentYear", { department, year: row.classYear })}</>
  ) : (
    <>{department}</>
  );
}

const REQUEST_TONES: Record<StudentRequestKind, StatusTone> = {
  awaitingDecision: StatusTone.Warning,
  alternativeProposed: StatusTone.Info,
  accepted: StatusTone.Success,
  declined: StatusTone.Error,
  withdrawn: StatusTone.Neutral,
};

function RequestCounts({ row }: { row: ProgramOfficeHoursStudentRow }) {
  const t = useTranslations("programOhStudents.requests");
  return (
    <span className="flex flex-wrap gap-1.5">
      {studentRequestCounts(row.requests).map((entry) => (
        <StatusBadge key={entry.kind} tone={REQUEST_TONES[entry.kind]}>
          {t(entry.kind, { count: entry.count })}
        </StatusBadge>
      ))}
    </span>
  );
}
