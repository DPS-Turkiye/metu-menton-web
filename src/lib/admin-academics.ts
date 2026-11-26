import {
  AcademicFilter,
  OfficeHoursFilter,
  type AdminAcademic,
} from "@/interfaces/admin-academics";

export const ACADEMIC_FILTERS = Object.values(AcademicFilter);

export const OFFICE_HOURS_FILTERS = Object.values(OfficeHoursFilter);

/** Hours set for a row; a program's list has no Office Hours numbers, so it counts as none. */
export function hasOfficeHours(row: AdminAcademic) {
  return row.officeHours?.hoursDefined ?? false;
}

function matchesOfficeHours(row: AdminAcademic, filter: OfficeHoursFilter) {
  switch (filter) {
    case OfficeHoursFilter.All:
      return true;
    case OfficeHoursFilter.Defined:
      return hasOfficeHours(row);
    case OfficeHoursFilter.NotYet:
      return !hasOfficeHours(row);
  }
}

function matchesFilter(row: AdminAcademic, filter: AcademicFilter) {
  switch (filter) {
    case AcademicFilter.SignedIn:
      return row.signedIn;
    case AcademicFilter.NotSignedIn:
      return !row.signedIn;
    case AcademicFilter.Inactive:
      return !row.active;
    default:
      return true;
  }
}

export function academicCounts(rows: AdminAcademic[]) {
  return Object.fromEntries(
    ACADEMIC_FILTERS.map((filter) => [
      filter,
      rows.filter((row) => matchesFilter(row, filter)).length,
    ]),
  ) as Record<AcademicFilter, number>;
}

/** The departments in the list, by name, for the "Bölüm" select. */
export function academicDepartments(rows: AdminAcademic[]) {
  return [
    ...new Set(
      rows
        .map((row) => row.departmentName)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort((a, b) => a.localeCompare(b, "tr"));
}

export function filterAcademics(
  rows: AdminAcademic[],
  {
    filter,
    officeHours = OfficeHoursFilter.All,
    query,
    department,
  }: {
    filter: AcademicFilter;
    officeHours?: OfficeHoursFilter;
    query: string;
    department: string | null;
  },
) {
  const needle = query.trim().toLocaleLowerCase("tr");
  return rows.filter(
    (row) =>
      matchesFilter(row, filter) &&
      matchesOfficeHours(row, officeHours) &&
      (department == null || row.departmentName === department) &&
      (needle === "" ||
        [row.fullName, row.email, row.departmentName, row.departmentCode]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr")
          .includes(needle)),
  );
}
