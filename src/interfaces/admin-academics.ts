/** An academician from the institution's records (Admin › Kullanıcılar › Akademisyenler); read-only. */
export type AdminAcademic = {
  personId: string;
  /** Null until they first sign in with their institution account. */
  userId: string | null;
  fullName: string;
  email: string | null;
  academicTitle: string | null;
  faculty: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  /** The institution still lists them as active. */
  active: boolean;
  signedIn: boolean;
  lastLoginAt: string | null;
  adviseeCount: number;
  /** The admin's Office Hours columns (FR-OH-30); null on a program's list, which doesn't show them. */
  officeHours: AdminAcademicOfficeHours | null;
};

export type AdminAcademicOfficeHours = {
  /** A weekly range, or one-off hours not over yet, whether or not students see them. */
  hoursDefined: boolean;
  /** This month's meetings on Istanbul's calendar, cancelled ones left out. */
  meetingsThisMonth: number;
};

/** The "Office Hours müsaitliği" filter: hours set ("Tanımlı") or not yet ("Henüz yok"). */
export enum OfficeHoursFilter {
  All = "ALL",
  Defined = "DEFINED",
  NotYet = "NOT_YET",
}

export enum AcademicFilter {
  All = "ALL",
  SignedIn = "SIGNED_IN",
  NotSignedIn = "NOT_SIGNED_IN",
  Inactive = "INACTIVE",
}
