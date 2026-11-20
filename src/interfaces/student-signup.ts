/** Mirrors the backend's StudentYear; the order is the order the form lists them in. */
export enum StudentYear {
  Prep = "PREP",
  Year1 = "YEAR_1",
  Year2 = "YEAR_2",
  Year3 = "YEAR_3",
  Year4 = "YEAR_4",
  Year5Plus = "YEAR_5_PLUS",
  Master = "MASTER",
  Doctorate = "DOCTORATE",
}

export const STUDENT_YEARS: readonly StudentYear[] = Object.values(StudentYear);

/** What `POST /api/auth/register/student` takes. No address: the backend reads the verified one from the token. */
export interface StudentRegistration {
  firstName: string;
  lastName: string;
  department: string;
  year: StudentYear;
}

/** The profile half of the sign-up form; `year` is null until one is picked. */
export interface StudentProfileForm {
  firstName: string;
  lastName: string;
  department: string;
  year: StudentYear | null;
}

export interface StudentAccountForm {
  email: string;
  password: string;
  passwordConfirm: string;
}
