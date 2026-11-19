import type {
  StudentAccountForm,
  StudentProfileForm,
  StudentRegistration,
} from "@/interfaces/student-signup";
import {
  EMAIL_PATTERN,
  emailCharacterError,
  isAllowedEmailDomain,
} from "@/lib/email";
import { passwordStrengthError } from "@/lib/password";

/** ODTÜ's domain; department addresses (ceng.metu.edu.tr) count too. The backend checks it again, from the token. */
export const ODTU_STUDENT_EMAIL_DOMAIN = "metu.edu.tr";

export const STUDENT_NAME_MAX_LENGTH = 100;
export const STUDENT_DEPARTMENT_MAX_LENGTH = 255;

export const EMPTY_STUDENT_PROFILE: StudentProfileForm = {
  firstName: "",
  lastName: "",
  department: "",
  year: null,
};

export const EMPTY_STUDENT_ACCOUNT: StudentAccountForm = {
  email: "",
  password: "",
  passwordConfirm: "",
};

export function isOdtuStudentEmail(email: string): boolean {
  const address = email.trim();
  return (
    EMAIL_PATTERN.test(address) &&
    isAllowedEmailDomain(address, [ODTU_STUDENT_EMAIL_DOMAIN])
  );
}

/** Only once the address looks finished, so the hint does not flash while it is being typed. */
export function showsNonOdtuEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim()) && !isOdtuStudentEmail(email);
}

/** The payload the backend takes, or null while a profile field is still empty. */
export function studentRegistration(
  profile: StudentProfileForm,
): StudentRegistration | null {
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
  const department = profile.department.trim();
  if (!firstName || !lastName || !department || profile.year === null) {
    return null;
  }
  return { firstName, lastName, department, year: profile.year };
}

export function passwordsMismatch(account: StudentAccountForm): boolean {
  return (
    account.passwordConfirm.length > 0 &&
    account.password !== account.passwordConfirm
  );
}

/** Whether the full form (profile and new login) can be sent to Firebase. */
export function canCreateStudentAccount(
  profile: StudentProfileForm,
  account: StudentAccountForm,
): boolean {
  return (
    studentRegistration(profile) !== null &&
    isOdtuStudentEmail(account.email) &&
    emailCharacterError(account.email) === null &&
    account.password.length > 0 &&
    passwordStrengthError(account.password) === null &&
    account.password === account.passwordConfirm
  );
}
