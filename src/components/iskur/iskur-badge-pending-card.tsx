"use client";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
import { useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { useIskurBadgePending } from "@/hooks/use-iskur-home";
import { PEER_MENTOR_GIVE_HREF } from "@/lib/peer-mentoring";

/**
 * Profilim for an İŞKUR intern without the Akran Mentoru badge: their İŞKUR work goes on, and the badge is optional,
 * any time in the term. Nothing for anyone else.
 */
export function IskurBadgePendingCard() {
  const t = useTranslations("iskurOnboarding.badgeCard");
  if (!useIskurBadgePending()) return null;
  return (
    <Card
      labelledBy="iskur-badge-pending"
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 flex-col items-start gap-1">
        <StatusBadge tone={StatusTone.Info}>{t("status")}</StatusBadge>
        <h2 id="iskur-badge-pending" className="type-h4 text-text-primary">
          {t("title")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("body")}</p>
      </div>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Small}
        href={PEER_MENTOR_GIVE_HREF}
      >
        {t("action")}
      </Button>
    </Card>
  );
}
