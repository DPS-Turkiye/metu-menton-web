"use client";

import { useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { useIskurTeamReveal } from "@/hooks/use-iskur-team-reveal";
import { ISKUR_ONBOARDING_HREF } from "@/lib/iskur-onboarding";

/**
 * Profilim's way back into a sent İŞKUR form until the coordinators place the intern (Figma 5.6: "Ekip atamana kadar
 * formunu Profilim'den düzenleyebilirsin"). Nothing for anyone else.
 */
export function IskurFormCard() {
  const t = useTranslations("iskurOnboarding.profileCard");
  const { reveal, placement } = useIskurTeamReveal();
  if (!reveal?.onboardingSubmitted || placement) return null;
  // TEST UI: placeholder until the design team's screen; replace when it arrives.
  return (
    <Card
      labelledBy="iskur-form"
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 flex-col gap-1">
        <h2 id="iskur-form" className="type-h4 text-text-primary">
          {t("title")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("body")}</p>
      </div>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Small}
        href={ISKUR_ONBOARDING_HREF}
      >
        {t("action")}
      </Button>
    </Card>
  );
}
