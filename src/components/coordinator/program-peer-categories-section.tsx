"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { useProgramPeerCategories } from "@/hooks/use-program-peer-categories";
import { PEER_TOPIC_CATEGORIES } from "@/interfaces/peer-mentoring";
import { errorMessage } from "@/lib/utils";

/**
 * Program Ayarları › "Aktif mentorluk kategorileri" (Figma 152:8056): one switch per category. None is active until
 * the coordinator turns it on; students and peer mentors only see the active ones. Saved on its own, apart from
 * "Değişiklikleri kaydet".
 */
export function ProgramPeerCategories({
  programId,
  readOnly,
  anchorId,
  title,
  note,
}: {
  programId: string;
  readOnly: boolean;
  /** The settings page's section anchor, so its side navigation still lands here. */
  anchorId: string;
  title: string;
  note: string;
}) {
  const t = useTranslations("programPeerCategories");
  const tTopic = useTranslations("peerTopics");
  const categories = useProgramPeerCategories(programId);
  const headingId = useId();

  return (
    <section
      id={anchorId}
      aria-labelledby={headingId}
      className="overflow-hidden rounded-card border border-border-subtle bg-background-surface"
    >
      <header className="flex flex-col gap-1 border-b border-border-subtle px-6 pt-6 pb-4">
        <h2 id={headingId} className="type-h4 text-text-primary">
          {title}
        </h2>
        <p className="type-body-sm text-text-secondary">{note}</p>
      </header>
      {categories.isLoading ? (
        <p role="status" className="px-6 py-4 type-body-sm text-text-muted">
          {t("loading")}
        </p>
      ) : categories.error ? (
        <p
          role="alert"
          className="px-6 py-4 type-body-sm text-status-error-text"
        >
          {errorMessage(categories.error, t("loadFailed"))}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border-subtle">
            {PEER_TOPIC_CATEGORIES.map((category) => {
              const on = categories.active.includes(category);
              return (
                <li key={category}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={readOnly || categories.saving}
                    onClick={() => categories.toggle(category)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-selected disabled:cursor-not-allowed"
                  >
                    <span
                      className={`type-body ${on ? "text-text-primary" : "text-text-secondary"}`}
                    >
                      {tTopic(category)}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                        on ? "bg-action-accent" : "bg-border-control"
                      } ${readOnly ? "opacity-60" : ""}`}
                    >
                      <span
                        className={`size-5 rounded-full bg-background-surface shadow-raised transition-transform ${
                          on ? "translate-x-5" : ""
                        }`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-6 py-4">
            {categories.active.length === 0 ? (
              <p className="rounded-xl bg-status-warning-bg px-3 py-2 type-body-sm text-status-warning-text">
                {t("noneActive")}
              </p>
            ) : (
              <p className="type-body-sm text-text-secondary">
                {t("activeCount", { count: categories.active.length })}
              </p>
            )}
            {readOnly ? null : (
              <div className="flex gap-2">
                <Button
                  variant={ButtonVariant.Ghost}
                  size={ButtonSize.Small}
                  disabled={!categories.dirty || categories.saving}
                  onClick={categories.reset}
                >
                  {t("cancel")}
                </Button>
                <Button
                  size={ButtonSize.Small}
                  disabled={!categories.dirty || categories.saving}
                  onClick={categories.save}
                >
                  {categories.saving ? t("saving") : t("save")}
                </Button>
              </div>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
