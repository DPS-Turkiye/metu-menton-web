// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";

import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import type { ProgramBlocker } from "@/interfaces/program";

/** Why a change was refused: the open work by kind and feature, counts only (409 `PROGRAM_WORK_OPEN`). */
export function ProgramBlockers({
  title,
  blockers,
}: {
  title: string;
  blockers: readonly ProgramBlocker[];
}) {
  const t = useTranslations("programFeatures");
  return (
    <InlineAlert tone={StatusTone.Error} title={title}>
      <ul className="list-disc space-y-1 pl-5">
        {blockers.map((blocker) => (
          <li key={`${blocker.feature}-${blocker.kind}`}>
            {t("blockerLine", {
              feature: t(`names.${blocker.feature}`),
              work: t(`blockers.${blocker.kind}`, { count: blocker.count }),
            })}
          </li>
        ))}
      </ul>
      <p className="mt-2">{t("blockersHint")}</p>
    </InlineAlert>
  );
}
