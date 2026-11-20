"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type RefObject } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import {
  describeAuthError,
  reloadAndCheckEmailVerified,
  resendVerificationEmail,
} from "@/lib/firebase/auth";

/** Marks the check finished; false when the button or an earlier poll already finished it. */
function markFinished(finished: RefObject<boolean>) {
  if (finished.current) return false;
  finished.current = true;
  return true;
}

export function VerifyEmailView({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => Promise<void>;
}) {
  const copy = useTranslations("verifyEmail");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (finishedRef.current) return;
      const verified = await reloadAndCheckEmailVerified();
      if (cancelled || !verified || !markFinished(finishedRef)) return;
      await onVerified();
    }

    const timer = window.setInterval(() => {
      void poll();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onVerified]);

  async function handleContinue() {
    setChecking(true);
    setError("");
    try {
      const verified = await reloadAndCheckEmailVerified();
      if (!verified) {
        setError(copy("notVerified"));
        return;
      }
      // The poll may have finished while this check was waiting; continuing twice would register twice.
      if (!markFinished(finishedRef)) return;
      await onVerified();
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setNotice("");
    try {
      await resendVerificationEmail();
      setNotice(copy("resent"));
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-4 py-8">
        <h1 className="text-center type-h2 text-text-primary">
          {copy("title")}
        </h1>
        <p className="text-center type-body text-text-secondary">
          {copy("sentBefore")}
          <span className="font-semibold text-text-primary">{email}</span>
          {copy("sentAfter")}
        </p>

        <Button
          size={ButtonSize.Large}
          fullWidth
          onClick={() => void handleContinue()}
          disabled={checking}
        >
          {checking ? copy("checking") : copy("confirm")}
        </Button>
        <Button
          variant={ButtonVariant.Ghost}
          size={ButtonSize.Large}
          fullWidth
          onClick={() => void handleResend()}
          disabled={resending}
        >
          {resending ? copy("resending") : copy("resend")}
        </Button>

        {notice ? (
          <InlineAlert tone={StatusTone.Info}>{notice}</InlineAlert>
        ) : null}
        {error ? (
          <InlineAlert tone={StatusTone.Error}>{error}</InlineAlert>
        ) : null}
      </div>
    </AuthShell>
  );
}
