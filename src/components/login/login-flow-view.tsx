"use client";

import { BriefcaseBusiness, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailView } from "@/components/auth/verify-email-view";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { OdtuLoginButton } from "@/components/login/odtu-login-button";
import { OtgLoginButton } from "@/components/login/otg-login-button";
import { useLoginChoices } from "@/hooks/use-login-choices";
import { useLoginFlow } from "@/hooks/use-login-flow";
import type { Edition } from "@/interfaces/edition";
import { SUPPORT_EMAIL } from "@/lib/const";
import { safeNextPath } from "@/lib/public-paths";

export function LoginFlowView({ edition }: { edition: Edition }) {
  const router = useRouter();
  const copy = useTranslations("login");
  const searchParams = useSearchParams();
  const {
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    notice,
    submitLogin,
    sendPasswordReset,
    needsEmailVerification,
    continueAfterEmailVerified,
    isReady,
    isVerifying,
    isVerified,
  } = useLoginFlow();
  const choices = useLoginChoices(edition);

  // The gate sends a signed-out visitor to /login?next=<where they were going>;
  // ignoring it landed everyone on the dashboard instead.
  const next = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (isVerified) router.push(next ?? "/workspace");
  }, [isVerified, next, router]);

  if (needsEmailVerification) {
    return (
      <VerifyEmailView email={email} onVerified={continueAfterEmailVerified} />
    );
  }

  return (
    <AuthShell>
      <form
        onSubmit={submitLogin}
        className="flex w-full max-w-[384px] flex-col gap-2"
      >
        {choices.odtuStudents ? (
          <div className="flex flex-col gap-6 pt-8">
            {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
            <div className="flex flex-col gap-2">
              <h1 className="type-h2 text-text-primary">{copy("title")}</h1>
              <p className="type-body text-text-secondary">
                {copy("odtuStudentIntro")}
              </p>
            </div>
            {choices.odtu ? (
              <>
                <OdtuLoginButton />
                <div className="flex items-center gap-3">
                  <span aria-hidden className="h-px flex-1 bg-border-subtle" />
                  <span className="type-caption text-text-muted">
                    {copy("or")}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-border-subtle" />
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <h1 className="pt-8 text-center type-h2 text-text-primary">
            {copy("title")}
          </h1>
        )}

        <div className="flex flex-col gap-4 pt-8">
          <AuthField
            id="login-email"
            label={copy("email")}
            required
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder={copy("emailPlaceholder")}
            value={email}
            onChange={setEmail}
          />
          <AuthField
            id="login-password"
            label={copy("password")}
            required
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            action={
              <button
                type="button"
                onClick={sendPasswordReset}
                className="type-label-sm text-text-link hover:underline"
              >
                {copy("forgotPassword")}
              </button>
            }
          />
        </div>

        <div className="pt-6">
          <Button
            type="submit"
            size={ButtonSize.Large}
            fullWidth
            disabled={!isReady || isVerifying}
          >
            {isVerifying ? copy("submitting") : copy("submit")}
          </Button>
          {choices.otg ? <OtgLoginButton next={next} /> : null}
        </div>

        {loginError ? (
          <InlineAlert tone={StatusTone.Error} className="mt-3">
            {loginError}
          </InlineAlert>
        ) : null}

        {notice ? (
          <InlineAlert tone={StatusTone.Info} className="mt-3">
            {notice}
          </InlineAlert>
        ) : null}

        {choices.odtuStudents ? (
          <section
            aria-labelledby="login-after"
            className="mt-6 flex flex-col gap-2 rounded-[12px] bg-background-subtle p-4"
          >
            <h2 id="login-after" className="type-caption text-text-secondary">
              {copy("afterTitle")}
            </h2>
            <ul className="flex flex-col gap-2 type-body-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <BriefcaseBusiness
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                />
                {copy("afterIskur")}
              </li>
              <li className="flex items-start gap-2">
                <UserRound
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                />
                {copy("afterBoth")}
              </li>
            </ul>
          </section>
        ) : null}

        {choices.signUp ? (
          <div className="mt-9 flex flex-col gap-3 border-t border-border-subtle pt-7">
            <p className="text-center type-label text-text-secondary">
              {copy("newHere")}
            </p>
            <Button
              href="/signup"
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Large}
              fullWidth
            >
              {copy("signUp")}
            </Button>
          </div>
        ) : null}

        {choices.invite ? (
          <div className="flex items-center justify-center pt-2">
            <Link
              href="/invite"
              className="type-caption text-text-secondary underline hover:text-text-primary"
            >
              {copy("invite")}
            </Link>
          </div>
        ) : null}

        {choices.odtu ? (
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="pt-6 text-center type-label-sm text-text-secondary hover:text-text-primary"
          >
            {copy("help")}
          </a>
        ) : null}
      </form>
    </AuthShell>
  );
}
