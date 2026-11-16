"use client";

import { useLocale, useTranslations } from "next-intl";

import { QueryNotice } from "@/components/admin/admin-ui";
import { ListPagination } from "@/components/common/list-pagination";
import { AppointmentStatusPill } from "@/components/coordinator/appointment-status-pill";
import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect, ToggleChip } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { SearchInput } from "@/components/ia/search-input";
import { StatCard } from "@/components/ia/stat-card";
import { StatusTone } from "@/components/ia/status-badge";
import { useProgramOfficeHoursAppointments } from "@/hooks/use-program-office-hours-appointments";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { formatMeetingShort } from "@/lib/format";
import { personName } from "@/lib/program-office-hours";
import { errorMessage } from "@/lib/utils";

/**
 * An Office Hours program's Randevular (Figma 152:7848): the status cards, the filters and every appointment at
 * the university with its title, time and the two people. Academicians decide; the coordinator only looks.
 */
export function ProgramAppointmentsView({ programId }: { programId: string }) {
  const appointments = useProgramOfficeHoursAppointments(programId);
  return (
    <ProgramDetailFrame
      programId={programId}
      tab={ProgramTab.Appointments}
      tabCounts={{
        [ProgramTab.Appointments]:
          appointments.data?.counts.awaitingDecision ?? null,
      }}
    >
      {() => <AppointmentsBody appointments={appointments} />}
    </ProgramDetailFrame>
  );
}

function AppointmentsBody({
  appointments,
}: {
  appointments: ReturnType<typeof useProgramOfficeHoursAppointments>;
}) {
  const t = useTranslations("programAppointments");
  const locale = useLocale();
  const { data, filters } = appointments;
  return (
    <div className="space-y-7">
      {data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            tone={StatusTone.Warning}
            label={t("cards.awaitingDecision")}
            value={data.counts.awaitingDecision}
          />
          <StatCard
            tone={StatusTone.Info}
            label={t("cards.alternativeProposed")}
            value={data.counts.alternativeProposed}
          />
          <StatCard
            tone={StatusTone.Success}
            label={t("cards.acceptedThisWeek")}
            value={data.counts.acceptedThisWeek}
          />
          <StatCard
            tone={StatusTone.Error}
            label={t("cards.declinedThisWeek")}
            value={data.counts.declinedThisWeek}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          value={filters.search}
          onChange={appointments.setSearch}
          className="w-full sm:w-80"
        />
        <ChipSelect
          label={t("statusLabel")}
          value={filters.status}
          options={appointments.statusOptions}
          onChange={appointments.setStatus}
        />
        <ChipSelect
          label={t("facultyLabel")}
          value={filters.faculty}
          options={appointments.facultyOptions}
          onChange={appointments.setFaculty}
        />
        <ToggleChip
          label={t("thisWeek")}
          pressed={filters.thisWeek}
          onToggle={appointments.toggleThisWeek}
        />
      </div>

      {data && appointments.error ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {errorMessage(appointments.error, t("loadFailed"))}
        </p>
      ) : null}

      {data ? (
        data.appointments.content.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
            {t("empty")}
          </p>
        ) : (
          <div
            aria-busy={appointments.isUpdating}
            className={appointments.isUpdating ? "opacity-60" : ""}
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
                  key: "academic",
                  label: t("columns.academic"),
                  className: "w-[280px]",
                },
                {
                  key: "time",
                  label: t("columns.time"),
                  className: "w-[200px]",
                },
                {
                  key: "status",
                  label: t("columns.status"),
                  className: "w-[200px]",
                },
                { key: "topic", label: t("columns.topic") },
              ]}
            >
              {data.appointments.content.map((row) => (
                <tr key={row.id}>
                  <DataCell>
                    <span className="flex items-center gap-1.5">
                      <InitialsAvatar name={row.student.name} />
                      {row.student.name}
                    </span>
                  </DataCell>
                  <DataCell>{personName(row.academic)}</DataCell>
                  <DataCell>
                    {row.startsAt
                      ? formatMeetingShort(row.startsAt, locale)
                      : t("noTime")}
                  </DataCell>
                  <DataCell>
                    <AppointmentStatusPill status={row.status} />
                  </DataCell>
                  <DataCell>{row.topic}</DataCell>
                </tr>
              ))}
            </DataTable>
            <ListPagination
              page={filters.page}
              totalPages={data.appointments.totalPages}
              onPageChange={appointments.setPage}
            />
          </div>
        )
      ) : (
        <QueryNotice
          isLoading={appointments.isLoading}
          error={appointments.error}
        />
      )}

      <Footnote>{t("footnote")}</Footnote>
    </div>
  );
}
