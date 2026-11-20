// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { Card } from "@/components/ia/card";
import { useIskurTaskOutputs } from "@/hooks/use-iskur-task-outputs";
import { formatReportDay } from "@/lib/peer-weekly-report";
import { formatDateTime, formatFileSize } from "@/lib/utils";

/** Görev çıktıları: the files interns handed in with their tasks, newest first, for the program's coordinators. */
export function IskurTaskOutputsCard({ programId }: { programId: string }) {
  const t = useTranslations("iskurWorkspace.taskOutputs");
  const locale = useLocale();
  const outputs = useIskurTaskOutputs(programId);
  if (outputs.isLoading) return null;
  if (outputs.loadError) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  return (
    <Card labelledBy="iskur-task-outputs" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2
          id="iskur-task-outputs"
          className="flex-1 type-title-card text-text-primary"
        >
          {t("title")}
        </h2>
        <p className="type-label-sm text-text-muted">
          {t("count", { count: outputs.fileCount })}
        </p>
      </div>
      <p className="type-body-sm text-text-secondary">{t("hint")}</p>
      {!outputs.enabled ? (
        <p className="type-body-sm text-text-muted">{t("off")}</p>
      ) : null}
      {outputs.tasks.length === 0 ? (
        <p className="type-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {outputs.tasks.map((task) => (
            <li
              key={task.taskId}
              className="flex flex-col gap-2 rounded-[12px] border border-border-subtle p-4"
            >
              <p className="type-label text-text-primary">{task.title}</p>
              <p className="type-caption text-text-muted">
                {t("taskMeta", {
                  team: task.teamName,
                  assignee: task.assignee.fullName,
                  date: formatReportDay(task.dueDate, locale).date,
                })}
              </p>
              <ul className="space-y-1">
                {task.files.map((file) => (
                  <li key={file.id}>
                    <a
                      href={outputs.hrefOf(task.taskId, file.id)}
                      download
                      className="type-body-sm break-all text-text-accent hover:underline"
                    >
                      {file.fileName}
                    </a>
                    <span className="ml-2 type-caption text-text-muted">
                      {t("fileMeta", {
                        size: formatFileSize(file.sizeBytes),
                        date: formatDateTime(file.uploadedAt, locale),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
