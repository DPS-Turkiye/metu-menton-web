// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";

import { Card } from "@/components/ia/card";
import { IskurTeamSupportDetails } from "@/components/iskur/team-support-details";
import { IskurTeamSupportForm } from "@/components/iskur/team-support-form";
import {
  useIskurTaskSupports,
  useIskurTeamSupport,
} from "@/hooks/use-iskur-team-support";

/**
 * "Görev detayı" › Başka ekipten destek (handbook p.14: "Dijital Dönüşüm ekibinden destek talebi açıldı"): the requests
 * opened for this task, and for a leader of the team the form to open one.
 */
export function IskurTaskSupportSection({
  taskId,
  canAsk,
}: {
  taskId: string;
  canAsk: boolean;
}) {
  const t = useTranslations("iskurTeamSupport.task");
  const supports = useIskurTaskSupports(taskId);
  if (supports.loading) return null;
  return (
    <Card labelledBy="iskur-task-support" className="flex flex-col gap-3">
      <h2 id="iskur-task-support" className="type-title-card text-text-primary">
        {t("title")}
      </h2>
      {supports.failed ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {t("loadFailed")}
        </p>
      ) : supports.requests.length === 0 ? (
        <p className="type-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {supports.requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-1 py-3">
              <p className="type-label text-text-primary">
                {t("line", { team: request.toTeamName })}
              </p>
              <IskurTeamSupportDetails request={request} />
            </li>
          ))}
        </ul>
      )}
      {canAsk ? <AskForTask taskId={taskId} /> : null}
    </Card>
  );
}

function AskForTask({ taskId }: { taskId: string }) {
  const t = useTranslations("iskurTeamSupport");
  const state = useIskurTeamSupport(taskId);
  if (state.loadFailed) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  if (!state.data) return null;
  return <IskurTeamSupportForm state={state} idPrefix="iskur-task-support" />;
}
