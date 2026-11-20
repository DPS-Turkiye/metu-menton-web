// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { useOdtuCasCallback } from "@/hooks/use-odtu-cas-callback";

export function OdtuCasCallbackView() {
  const copy = useTranslations("odtuCasLogin");
  const { error } = useOdtuCasCallback();

  return (
    <AuthShell>
      <div className="flex w-full max-w-[440px] flex-col items-center gap-3 pt-8 text-center">
        {error ? (
          <>
            <p role="alert" className="type-caption text-status-error-text">
              {error}
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold text-brand-odtu-primary hover:underline"
            >
              {copy("backToLogin")}
            </Link>
          </>
        ) : (
          <p role="status" className="text-sm text-text-secondary">
            {copy("signingIn")}
          </p>
        )}
      </div>
    </AuthShell>
  );
}
