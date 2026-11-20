import { describe, expect, it } from "vitest";

import {
  StudentYear,
  type StudentProfileForm,
} from "@/interfaces/student-signup";
import {
  canCreateStudentAccount,
  EMPTY_STUDENT_PROFILE,
  isOdtuStudentEmail,
  passwordsMismatch,
  showsNonOdtuEmail,
  studentRegistration,
} from "@/lib/student-signup";

const PROFILE: StudentProfileForm = {
  firstName: " Deniz ",
  lastName: " Kaya ",
  department: " Fizik ",
  year: StudentYear.Year3,
};

const ACCOUNT = {
  email: "deniz@metu.edu.tr",
  password: "Guclu-Sifre1",
  passwordConfirm: "Guclu-Sifre1",
};

describe("isOdtuStudentEmail", () => {
  it.each([
    "deniz@metu.edu.tr",
    " Deniz@METU.edu.tr ",
    "deniz@ceng.metu.edu.tr",
  ])("accepts %j", (email) => {
    expect(isOdtuStudentEmail(email)).toBe(true);
  });

  it.each([
    "deniz@example.test",
    "deniz@evilmetu.edu.tr",
    "deniz@metu.edu.tr.example.test",
    "metu.edu.tr",
    "",
  ])("refuses %j", (email) => {
    expect(isOdtuStudentEmail(email)).toBe(false);
  });
});

describe("showsNonOdtuEmail", () => {
  it("waits until the address looks finished", () => {
    expect(showsNonOdtuEmail("deniz@exa")).toBe(false);
    expect(showsNonOdtuEmail("deniz@example.test")).toBe(true);
    expect(showsNonOdtuEmail("deniz@metu.edu.tr")).toBe(false);
  });
});

describe("studentRegistration", () => {
  it("trims the profile into the backend's payload", () => {
    expect(studentRegistration(PROFILE)).toEqual({
      firstName: "Deniz",
      lastName: "Kaya",
      department: "Fizik",
      year: StudentYear.Year3,
    });
  });

  it("is null while a field is empty or no year is picked", () => {
    expect(studentRegistration(EMPTY_STUDENT_PROFILE)).toBeNull();
    expect(studentRegistration({ ...PROFILE, department: "  " })).toBeNull();
    expect(studentRegistration({ ...PROFILE, year: null })).toBeNull();
  });
});

describe("canCreateStudentAccount", () => {
  it("needs the whole profile, an ODTÜ address and a strong, repeated password", () => {
    expect(canCreateStudentAccount(PROFILE, ACCOUNT)).toBe(true);
    expect(canCreateStudentAccount({ ...PROFILE, year: null }, ACCOUNT)).toBe(
      false,
    );
    expect(
      canCreateStudentAccount(PROFILE, {
        ...ACCOUNT,
        email: "deniz@example.test",
      }),
    ).toBe(false);
    expect(
      canCreateStudentAccount(PROFILE, {
        ...ACCOUNT,
        email: "denız@metu.edu.tr",
      }),
    ).toBe(false);
    expect(
      canCreateStudentAccount(PROFILE, {
        ...ACCOUNT,
        password: "weak",
        passwordConfirm: "weak",
      }),
    ).toBe(false);
    expect(
      canCreateStudentAccount(PROFILE, {
        ...ACCOUNT,
        passwordConfirm: "Guclu-Sifre2",
      }),
    ).toBe(false);
  });
});

describe("passwordsMismatch", () => {
  it("only speaks up once the repeat has been typed", () => {
    expect(passwordsMismatch({ ...ACCOUNT, passwordConfirm: "" })).toBe(false);
    expect(passwordsMismatch({ ...ACCOUNT, passwordConfirm: "x" })).toBe(true);
    expect(passwordsMismatch(ACCOUNT)).toBe(false);
  });
});
