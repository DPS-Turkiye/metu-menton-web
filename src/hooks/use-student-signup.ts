"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type SubmitEvent } from "react";

import { useSession } from "@/components/providers/session-provider";
import type {
  StudentAccountForm,
  StudentProfileForm,
} from "@/interfaces/student-signup";
import { ClientApiError } from "@/lib/client/api";
import { registerStudent } from "@/lib/client/auth";
import {
  ACCOUNT_ALREADY_REGISTERED,
  EMAIL_ALREADY_REGISTERED,
} from "@/lib/const";
import { emailCharacterError } from "@/lib/email";
import {
  createFirebaseAccount,
  currentFirebaseAccount,
  currentIdToken,
  describeAuthError,
} from "@/lib/firebase/auth";
import { passwordStrengthError } from "@/lib/password";
import {
  canCreateStudentAccount,
  EMPTY_STUDENT_ACCOUNT,
  EMPTY_STUDENT_PROFILE,
  passwordsMismatch,
  showsNonOdtuEmail,
  studentRegistration,
} from "@/lib/student-signup";
import { StudentSignupStep } from "@/types/student-signup";

/** A sign-up that meets an existing account just signs in: the backend already ties a verified address to it. */
function isAlreadyRegistered(error: unknown) {
  return (
    error instanceof ClientApiError &&
    (error.code === ACCOUNT_ALREADY_REGISTERED ||
      error.code === EMAIL_ALREADY_REGISTERED)
  );
}

/**
 * ODTÜ's /signup: the form → a Firebase login and its verification mail → once verified, the backend account → a
 * session. `?resume=1` (sent by /login for a verified login without an account) skips to the profile.
 */
export function useStudentSignup() {
  const copy = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();
  const isResuming = searchParams.get("resume") === "1";
  const [step, setStep] = useState(
    isResuming ? StudentSignupStep.Loading : StudentSignupStep.Form,
  );
  const [profile, setProfile] = useState<StudentProfileForm>(
    EMPTY_STUDENT_PROFILE,
  );
  const [account, setAccount] = useState<StudentAccountForm>(
    EMPTY_STUDENT_ACCOUNT,
  );
  const [loginEmail, setLoginEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isResuming) return;
    const cancellation = new AbortController();
    void (async () => {
      const firebaseAccount = await currentFirebaseAccount();
      if (cancellation.signal.aborted) return;
      if (!firebaseAccount) {
        setStep(StudentSignupStep.Form);
        return;
      }
      setLoginEmail(firebaseAccount.email);
      setStep(
        firebaseAccount.verified
          ? StudentSignupStep.Profile
          : StudentSignupStep.Verify,
      );
    })();
    return () => cancellation.abort();
  }, [isResuming]);

  const updateProfile = useCallback(
    <K extends keyof StudentProfileForm>(
      key: K,
      value: StudentProfileForm[K],
    ) => setProfile((current) => ({ ...current, [key]: value })),
    [],
  );

  const updateAccount = useCallback(
    <K extends keyof StudentAccountForm>(
      key: K,
      value: StudentAccountForm[K],
    ) => setAccount((current) => ({ ...current, [key]: value })),
    [],
  );

  const register = useCallback(async () => {
    const payload = studentRegistration(profile);
    if (!payload) {
      setStep(StudentSignupStep.Profile);
      return;
    }
    setError("");
    setStep(StudentSignupStep.Registering);
    try {
      const idToken = await currentIdToken();
      if (!idToken) throw new Error(copy("sessionExpired"));
      try {
        await registerStudent(payload, idToken);
      } catch (caught) {
        if (!isAlreadyRegistered(caught)) throw caught;
      }
      await login(idToken);
      router.push("/workspace");
    } catch (caught) {
      setError(describeAuthError(caught));
      setStep(StudentSignupStep.Profile);
    }
  }, [copy, login, profile, router]);

  async function createAccount(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateStudentAccount(profile, account) || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await createFirebaseAccount(account.email, account.password);
      setLoginEmail(account.email.trim());
      setStep(StudentSignupStep.Verify);
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function submitProfile(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void register();
  }

  return {
    step,
    profile,
    account,
    loginEmail,
    updateProfile,
    updateAccount,
    error,
    submitting: submitting || step === StudentSignupStep.Registering,
    canCreateAccount: canCreateStudentAccount(profile, account),
    canRegister: studentRegistration(profile) !== null,
    emailCharacterErrorMessage: emailCharacterError(account.email),
    nonOdtuEmail: showsNonOdtuEmail(account.email),
    passwordStrengthErrorMessage: passwordStrengthError(account.password),
    passwordsMismatch: passwordsMismatch(account),
    createAccount,
    submitProfile,
    finishVerification: register,
  };
}
