import { useTranslations } from "next-intl";

import { StatusTone } from "@/components/ia/status-badge";
import { Tag } from "@/components/ia/tag";
import {
  badgePending,
  GateBadgeState,
  inTraining,
  type GateBadgeRow,
} from "@/interfaces/badges";

const BADGE_TONES: Record<GateBadgeState, StatusTone> = {
  [GateBadgeState.None]: StatusTone.Neutral,
  [GateBadgeState.Active]: StatusTone.Success,
  [GateBadgeState.Expired]: StatusTone.Warning,
  [GateBadgeState.Revoked]: StatusTone.Warning,
};

/** The "Rozet" column's tag (Figma 152:7525, 152:7963): "Rozet Doğrulandı", "Rozet Yok", "Eğitimde", "Rozet bekleniyor"… */
export function GateBadgeTag({
  row,
}: {
  row: Pick<GateBadgeRow, "state" | "training" | "iskurIntern">;
}) {
  const t = useTranslations("peerParticipants");
  if (inTraining(row)) {
    return <Tag tone={StatusTone.Warning}>{t("badgeStates.IN_TRAINING")}</Tag>;
  }
  if (badgePending(row)) {
    return <Tag tone={StatusTone.Info}>{t("badgeStates.BADGE_PENDING")}</Tag>;
  }
  return (
    <Tag tone={BADGE_TONES[row.state]}>{t(`badgeStates.${row.state}`)}</Tag>
  );
}
