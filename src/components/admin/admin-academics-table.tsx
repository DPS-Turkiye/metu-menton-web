"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { Avatar } from "@/components/admin/admin-ui";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect } from "@/components/ia/filter-chip";
import { InfoBanner } from "@/components/ia/info-banner";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { RowActionsMenu } from "@/components/ia/row-actions-menu";
import { SearchInput } from "@/components/ia/search-input";
import { StatusTone } from "@/components/ia/status-badge";
import { Tag } from "@/components/ia/tag";
import {
  useAdminAcademics,
  type AcademicsList,
} from "@/hooks/use-admin-academics";
import {
  AcademicFilter,
  OfficeHoursFilter,
  type AdminAcademic,
  type AdminAcademicOfficeHours,
} from "@/interfaces/admin-academics";
import { ACADEMIC_FILTERS, OFFICE_HOURS_FILTERS } from "@/lib/admin-academics";
import { errorMessage, formatLongDate, initials } from "@/lib/utils";

/** "Tüm bölümler" in the Bölüm chip; the hook keeps it as no department. */
const ALL_DEPARTMENTS = "";

/** Kullanıcılar › Akademisyenler (Figma 152:7644): the institution's academicians, read-only. */
export function AdminAcademicsTable() {
  const t = useTranslations("adminAcademics");
  return (
    <AcademicsTable
      academics={useAdminAcademics()}
      intro={t("intro")}
      showContact
    />
  );
}

/**
 * The academicians list, shared by the admin's Kullanıcılar and an Office Hours program's Katılımcılar.
 * Without {@code showContact} there is no e-mail, no Office Hours numbers and no filter for them (the program list
 * leaves them out).
 */
export function AcademicsTable({
  academics,
  intro,
  showContact,
}: {
  academics: AcademicsList;
  intro: string;
  showContact: boolean;
}) {
  const t = useTranslations("adminAcademics");

  return (
    <div className="space-y-7">
      <InfoBanner>{intro}</InfoBanner>
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          value={academics.search}
          onChange={academics.setSearch}
          className="w-full sm:w-80"
        />
        {showContact ? (
          <ChipSelect
            label={t("officeHoursFilter")}
            value={academics.officeHours}
            options={OFFICE_HOURS_FILTERS.map((value) => ({
              value,
              label:
                value === OfficeHoursFilter.All
                  ? t("officeHoursAll")
                  : t(`officeHoursFilters.${value}`),
            }))}
            onChange={academics.setOfficeHours}
          />
        ) : null}
        <ChipSelect
          label={t("department")}
          value={academics.department ?? ALL_DEPARTMENTS}
          options={[
            { value: ALL_DEPARTMENTS, label: t("allDepartments") },
            ...academics.departments.map((name) => ({
              value: name,
              label: name,
            })),
          ]}
          onChange={(value) => academics.setDepartment(value || null)}
        />
        <ChipSelect
          label={t("signInFilter")}
          value={academics.filter}
          options={ACADEMIC_FILTERS.map((value) => ({
            value,
            label: t("filterWithCount", {
              label:
                value === AcademicFilter.All
                  ? t("signInAll")
                  : t(`filters.${value}`),
              count: academics.counts[value],
            }),
          }))}
          onChange={academics.setFilter}
        />
      </div>

      <AcademicsBody academics={academics} showContact={showContact} />

      {academics.open ? (
        <AcademicDrawer
          academic={academics.open}
          showContact={showContact}
          onClose={academics.closeDrawer}
        />
      ) : null}
    </div>
  );
}

function AcademicsBody({
  academics,
  showContact,
}: {
  academics: AcademicsList;
  showContact: boolean;
}) {
  const t = useTranslations("adminAcademics");
  if (academics.error) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {errorMessage(academics.error, t("loadFailed"))}
      </p>
    );
  }
  if (academics.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (academics.rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
        {academics.total === 0 ? t("none") : t("empty")}
      </p>
    );
  }
  return (
    <DataTable
      caption={t("caption")}
      columns={[
        {
          key: "academic",
          label: t("columns.academic"),
          className: "w-[280px]",
        },
        {
          key: "department",
          label: t("columns.department"),
          className: "w-[220px]",
        },
        ...(showContact
          ? [
              {
                key: "officeHours",
                label: t("columns.officeHours"),
                className: "w-[180px]",
              },
              {
                key: "meetingsThisMonth",
                label: t("columns.meetingsThisMonth"),
                className: "w-[120px]",
              },
            ]
          : []),
        {
          key: "advisees",
          label: t("columns.advisees"),
          className: "w-[130px]",
        },
        { key: "signIn", label: t("columns.signIn"), className: "w-[170px]" },
        { key: "status", label: t("columns.status"), className: "w-[120px]" },
        {
          key: "actions",
          label: <span className="sr-only">{t("columns.actions")}</span>,
        },
      ]}
    >
      {academics.rows.map((row) => (
        <AcademicRow
          key={row.personId}
          row={row}
          showContact={showContact}
          onOpen={() => academics.openDrawer(row.personId)}
        />
      ))}
    </DataTable>
  );
}

function AcademicRow({
  row,
  showContact,
  onOpen,
}: {
  row: AdminAcademic;
  showContact: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations("adminAcademics");
  const name = [row.academicTitle, row.fullName].filter(Boolean).join(" ");
  return (
    <tr>
      <DataCell rowHeader>
        <span className="flex items-center gap-1.5">
          <InitialsAvatar name={row.fullName} personId={row.personId} />
          <span className="min-w-0">
            <span className="block">{name}</span>
            <span className="block type-caption text-text-muted">
              {(showContact ? row.email : row.faculty) ?? "—"}
            </span>
          </span>
        </span>
      </DataCell>
      <DataCell>{row.departmentName ?? "—"}</DataCell>
      {showContact ? <OfficeHoursCells officeHours={row.officeHours} /> : null}
      <DataCell>{row.adviseeCount}</DataCell>
      <DataCell>
        <SignInCell row={row} />
      </DataCell>
      <DataCell>
        <RecordTag active={row.active} />
      </DataCell>
      <DataCell className="text-right">
        <RowActionsMenu
          label={t("rowActions", { name: row.fullName })}
          actions={[{ id: "open", label: t("open"), onSelect: onOpen }]}
        />
      </DataCell>
    </tr>
  );
}

function SignInCell({ row }: { row: AdminAcademic }) {
  const t = useTranslations("adminAcademics");
  const locale = useLocale();
  if (!row.signedIn) {
    return <span className="text-text-muted">{t("notSignedIn")}</span>;
  }
  return (
    <span>
      {row.lastLoginAt
        ? t("lastSignIn", { date: formatLongDate(row.lastLoginAt, locale) })
        : t("signedIn")}
    </span>
  );
}

function RecordTag({ active }: { active: boolean }) {
  const t = useTranslations("adminAcademics");
  return active ? (
    <Tag tone={StatusTone.Success}>{t("active")}</Tag>
  ) : (
    <Tag tone={StatusTone.Neutral}>{t("inactive")}</Tag>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function AcademicDrawer({
  academic,
  showContact,
  onClose,
}: {
  academic: AdminAcademic;
  showContact: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("adminAcademics");
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const department = [academic.departmentName, academic.departmentCode]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t("drawer.title")}: ${academic.fullName}`}
      className="admin-backdrop-in fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <aside
        className="admin-drawer-in flex h-full w-full max-w-[460px] flex-col rounded-l-[28px] bg-white shadow-[0_16px_48px_rgba(33,38,43,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              personId={academic.personId}
              initials={initials(academic.fullName)}
              tone="blue"
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-[18px] font-semibold text-[#22262b]">
                {academic.fullName}
              </p>
              <p className="truncate text-[12.5px] text-[#858c96]">
                {academic.academicTitle ?? t("drawer.title")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-[#676e78] hover:bg-[#f5f6f8]"
          >
            ×
          </button>
        </div>
        <dl className="mt-5 flex-1 space-y-3 overflow-y-auto px-6 pb-4 text-[13.5px] text-[#22262b]">
          <Field label={t("drawer.academicTitle")}>
            {academic.academicTitle ?? "—"}
          </Field>
          <Field label={t("drawer.faculty")}>{academic.faculty ?? "—"}</Field>
          <Field label={t("drawer.department")}>{department || "—"}</Field>
          {showContact ? (
            <Field label={t("drawer.email")}>{academic.email ?? "—"}</Field>
          ) : null}
          <Field label={t("drawer.record")}>
            <RecordTag active={academic.active} />
          </Field>
          <Field label={t("drawer.signIn")}>
            <SignInCell row={academic} />
          </Field>
          <Field label={t("drawer.advisees")}>
            {t("advisees", { count: academic.adviseeCount })}
          </Field>
          <Field label={t("drawer.officeHours")}>
            <OfficeHoursSummary officeHours={academic.officeHours} />
          </Field>
        </dl>
        <p className="mx-6 mb-6 rounded-2xl bg-[#f5f6f8] px-4 py-3 text-[12.5px] text-[#676e78]">
          {t("drawer.readOnly")}
        </p>
      </aside>
    </div>
  );
}

/** The two admin columns; a program's list has no numbers and no columns for them. */
function OfficeHoursCells({
  officeHours,
}: {
  officeHours: AdminAcademicOfficeHours | null;
}) {
  if (!officeHours) {
    return (
      <>
        <DataCell className="text-text-muted">—</DataCell>
        <DataCell className="text-text-muted">—</DataCell>
      </>
    );
  }
  return (
    <>
      <DataCell>
        <HoursTag defined={officeHours.hoursDefined} />
      </DataCell>
      <DataCell>{officeHours.meetingsThisMonth}</DataCell>
    </>
  );
}

function HoursTag({ defined }: { defined: boolean }) {
  const t = useTranslations("adminAcademics");
  return defined ? (
    <Tag tone={StatusTone.Success}>{t("hoursDefined")}</Tag>
  ) : (
    <Tag tone={StatusTone.Warning}>{t("hoursNotYet")}</Tag>
  );
}

function OfficeHoursSummary({
  officeHours,
}: {
  officeHours: AdminAcademicOfficeHours | null;
}) {
  const t = useTranslations("adminAcademics");
  if (!officeHours) {
    return (
      <span className="text-[12.5px] text-[#858c96]">
        {t("drawer.officeHoursPending")}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-[12.5px]">
      <HoursTag defined={officeHours.hoursDefined} />
      {t("drawer.meetingsThisMonth", { count: officeHours.meetingsThisMonth })}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
      <dt className="text-[#858c96]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
