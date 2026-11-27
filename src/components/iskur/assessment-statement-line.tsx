// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { useIskurAssessmentLine } from "@/hooks/use-iskur-assessment-statement";
import { PEER_MENTOR_TRAINING_HREF } from "@/lib/peer-mentoring";
import { IskurAssessmentLine } from "@/types/iskur-assessment";

/**
 * Under Bu Haftam's mentoring target: "Değerlendirmeyi tamamlayamadın mı? Koordinatörüne açıkla", or that the
 * statement waits. Both lead to the training page, where the form and the decision live.
 */
export function IskurAssessmentStatementLine({
  mentoringTarget,
}: {
  mentoringTarget: number | null;
}) {
  const t = useTranslations("iskurAssessment.thisWeek");
  const line = useIskurAssessmentLine(mentoringTarget);
  if (line === null) return null;
  const waiting = line === IskurAssessmentLine.Waiting;
  return (
    <p className="mt-3 type-caption text-text-secondary">
      {waiting ? t("waiting") : t("offer")}{" "}
      <Link
        href={PEER_MENTOR_TRAINING_HREF}
        className="type-label-sm text-text-accent hover:underline"
      >
        {waiting ? t("open") : t("explain")}
      </Link>
    </p>
  );
}
