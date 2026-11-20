// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import {
  AuthField,
  authFieldClass,
  authLabelClass,
} from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailDomainNote } from "@/components/auth/email-domain-note";
import { VerifyEmailView } from "@/components/auth/verify-email-view";
import { Button, ButtonSize } from "@/components/ia/button";
import { useStudentSignup } from "@/hooks/use-student-signup";
import { STUDENT_YEARS, StudentYear } from "@/interfaces/student-signup";
import { isEnumValue } from "@/lib/enum";
import { PASSWORD_HINT } from "@/lib/password";
import {
  ODTU_STUDENT_EMAIL_DOMAIN,
  STUDENT_DEPARTMENT_MAX_LENGTH,
  STUDENT_NAME_MAX_LENGTH,
} from "@/lib/student-signup";
import { StudentSignupStep } from "@/types/student-signup";

type StudentSignup = ReturnType<typeof useStudentSignup>;

const hintClass = "mt-1.5 text-xs text-text-secondary";
const fieldErrorClass = "mt-1.5 text-xs text-status-error-text";

function ProfileFields({ signup }: { signup: StudentSignup }) {
  const copy = useTranslations("studentSignup");
  const fields = useTranslations("auth");
  const { profile, updateProfile } = signup;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          id="student-first-name"
          label={fields("firstName")}
          required
          autoComplete="given-name"
          maxLength={STUDENT_NAME_MAX_LENGTH}
          value={profile.firstName}
          onChange={(value) => updateProfile("firstName", value)}
        />
        <AuthField
          id="student-last-name"
          label={fields("lastName")}
          required
          autoComplete="family-name"
          maxLength={STUDENT_NAME_MAX_LENGTH}
          value={profile.lastName}
          onChange={(value) => updateProfile("lastName", value)}
        />
      </div>
      <AuthField
        id="student-department"
        label={copy("department")}
        required
        placeholder={copy("departmentPlaceholder")}
        maxLength={STUDENT_DEPARTMENT_MAX_LENGTH}
        value={profile.department}
        onChange={(value) => updateProfile("department", value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="student-year" className={authLabelClass}>
          {copy("year")}
          <span className="text-text-accent"> *</span>
        </label>
        <select
          id="student-year"
          required
          value={profile.year ?? ""}
          onChange={(event) =>
            updateProfile(
              "year",
              isEnumValue(StudentYear, event.target.value)
                ? event.target.value
                : null,
            )
          }
          className={authFieldClass}
        >
          <option value="" disabled>
            {copy("yearPlaceholder")}
          </option>
          {STUDENT_YEARS.map((year) => (
            <option key={year} value={year}>
              {copy(`years.${year}`)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function AccountFields({ signup }: { signup: StudentSignup }) {
  const copy = useTranslations("studentSignup");
  const fields = useTranslations("auth");
  const { account, updateAccount } = signup;
  return (
    <>
      <div>
        <AuthField
          id="student-email"
          label={fields("email")}
          required
          type="text"
          inputMode="email"
          autoComplete="email"
          placeholder={copy("emailPlaceholder")}
          value={account.email}
          onChange={(value) => updateAccount("email", value)}
        />
        {signup.emailCharacterErrorMessage ? (
          <p role="alert" className={fieldErrorClass}>
            {signup.emailCharacterErrorMessage}
          </p>
        ) : (
          <EmailDomainNote
            domains={`@${ODTU_STUDENT_EMAIL_DOMAIN}`}
            notAllowed={signup.nonOdtuEmail}
          />
        )}
      </div>
      <div>
        <AuthField
          id="student-password"
          label={fields("password")}
          required
          type="password"
          autoComplete="new-password"
          value={account.password}
          onChange={(value) => updateAccount("password", value)}
        />
        {signup.passwordStrengthErrorMessage ? (
          <p role="alert" className={fieldErrorClass}>
            {signup.passwordStrengthErrorMessage}
          </p>
        ) : (
          <p className={hintClass}>{PASSWORD_HINT}</p>
        )}
      </div>
      <div>
        <AuthField
          id="student-password-confirm"
          label={fields("passwordConfirm")}
          required
          type="password"
          autoComplete="new-password"
          placeholder={fields("passwordConfirmPlaceholder")}
          value={account.passwordConfirm}
          onChange={(value) => updateAccount("passwordConfirm", value)}
        />
        {signup.passwordsMismatch ? (
          <p role="alert" className={fieldErrorClass}>
            {fields("passwordsMismatch")}
          </p>
        ) : null}
      </div>
    </>
  );
}

function StudentSignupForm({
  signup,
  withAccount,
}: {
  signup: StudentSignup;
  withAccount: boolean;
}) {
  const copy = useTranslations("studentSignup");
  const fields = useTranslations("auth");
  return (
    <AuthShell>
      <form
        onSubmit={withAccount ? signup.createAccount : signup.submitProfile}
        className="flex flex-col gap-6 pt-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="type-h2 text-text-primary">
            {withAccount ? copy("title") : copy("profileTitle")}
          </h1>
          <p className="type-body text-text-secondary">
            {withAccount
              ? copy("intro")
              : copy("profileIntro", { email: signup.loginEmail })}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <ProfileFields signup={signup} />
          {withAccount ? <AccountFields signup={signup} /> : null}
        </div>
        <Button
          type="submit"
          size={ButtonSize.Large}
          fullWidth
          disabled={
            signup.submitting ||
            !(withAccount ? signup.canCreateAccount : signup.canRegister)
          }
        >
          {signup.submitting
            ? copy("submitting")
            : withAccount
              ? copy("submit")
              : copy("finish")}
        </Button>
        {signup.error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {signup.error}
          </p>
        ) : null}
        <p className="text-center type-body-sm text-text-secondary">
          {copy("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-text-primary">
            {fields("signIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

/** ODTÜ's /signup: a student with a @metu.edu.tr address, straight in once the address is verified. */
export function StudentSignupFlow() {
  const copy = useTranslations("studentSignup");
  const signup = useStudentSignup();

  switch (signup.step) {
    case StudentSignupStep.Loading:
      return (
        <AuthShell>
          <p role="status" className="py-12 text-center type-body-sm">
            {copy("checking")}
          </p>
        </AuthShell>
      );
    case StudentSignupStep.Verify:
      return (
        <VerifyEmailView
          email={signup.loginEmail}
          onVerified={signup.finishVerification}
        />
      );
    case StudentSignupStep.Form:
      return <StudentSignupForm signup={signup} withAccount />;
    case StudentSignupStep.Profile:
    case StudentSignupStep.Registering:
      return <StudentSignupForm signup={signup} withAccount={false} />;
  }
}
