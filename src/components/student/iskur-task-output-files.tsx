// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import type { useIskurTask } from "@/hooks/use-iskur-task";
import { ISKUR_TASK_OUTPUT_ACCEPT } from "@/lib/iskur-tasks";
import { formatDateTime, formatFileSize } from "@/lib/utils";

type View = ReturnType<typeof useIskurTask>;

/**
 * The files handed in with a task. The assignee adds up to five and takes their own back while the task is open; a
 * leader of the team downloads them. While file storage is off the upload control is not shown at all.
 */
export function IskurTaskOutputFiles({ view }: { view: View }) {
  const t = useTranslations("iskurTask.files");
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const files = view.outputFiles;
  if (!view.showsUpload && files.length === 0) return null;

  return (
    <section
      aria-labelledby="iskur-task-files"
      aria-busy={view.uploading}
      className="space-y-3"
    >
      <h3 id="iskur-task-files" className="type-label text-text-primary">
        {t("title")}
      </h3>
      {files.length === 0 ? (
        <p className="type-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-3 rounded-[12px] border border-border-subtle px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={view.outputHref(file.id)}
                  download
                  className="type-body break-all text-text-accent hover:underline"
                >
                  {file.fileName}
                </a>
                <p className="type-caption text-text-muted">
                  {t("meta", {
                    size: formatFileSize(file.sizeBytes),
                    date: formatDateTime(file.uploadedAt, locale),
                  })}
                </p>
              </div>
              {file.canRemove ? (
                <Button
                  variant={ButtonVariant.Ghost}
                  size={ButtonSize.Small}
                  disabled={view.busy}
                  aria-label={t("removeLabel", { name: file.fileName })}
                  onClick={() => view.removeFile(file.id)}
                >
                  {t("remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {view.showsUpload ? (
        <div className="space-y-2">
          {/* Opened by the button below; hidden from assistive tech so the button is the one control. */}
          <input
            ref={input}
            type="file"
            accept={ISKUR_TASK_OUTPUT_ACCEPT}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            disabled={!view.canAttach}
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              event.target.value = "";
              if (chosen) view.attachFile(chosen);
            }}
          />
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            disabled={!view.canAttach}
            onClick={() => input.current?.click()}
          >
            {t(view.uploading ? "uploading" : "choose")}
          </Button>
          <p role="status" className="type-caption text-text-muted">
            {view.uploading
              ? t("uploading")
              : t(view.outputFilesFull ? "full" : "hint", {
                  count: files.length,
                  max: view.outputFilesMax,
                })}
          </p>
          <p className="type-caption text-text-muted">{t("privacy")}</p>
        </div>
      ) : null}
    </section>
  );
}
