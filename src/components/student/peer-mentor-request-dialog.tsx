"use client";

import {
  Bell,
  CalendarDays,
  CircleCheck,
  Info,
  RotateCcw,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { ToggleChip } from "@/components/ia/filter-chip";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { InitialsAvatar } from "@/components/student/ia/ui";
import { RequestStatusBadge } from "@/components/student/iskur-ui";
import { usePeerMentorRequestForm } from "@/hooks/use-peer-mentoring";
import type {
  PeerMentorCard,
  PeerMentoringRequest,
} from "@/interfaces/peer-mentoring";
import { PEER_MENTORSHIPS_HREF } from "@/lib/peer-mentoring";

const panelClassName =
  "w-full max-w-[560px] rounded-[28px] bg-background-surface p-7 shadow-modal outline-none";

const fieldClass =
  "w-full rounded-input border border-border-control bg-background-surface px-4 type-body text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-selected";

/**
 * "Mentorluk talebi gönder": one of the mentor's categories and a short message; once sent, "Talebin iletildi" with
 * what happens next (Figma 4.3, 4.3b).
 */
export function PeerMentorRequestDialog({
  mentor,
  onClose,
}: {
  mentor: PeerMentorCard;
  onClose: () => void;
}) {
  const t = useTranslations("iaIskur.take.dialog");
  const tTopic = useTranslations("peerTopics");
  const form = usePeerMentorRequestForm(mentor);

  if (form.sent) {
    return (
      // Its own key, so the dialog mounts again and moves focus into the confirmation.
      <ModalDialog
        key="sent"
        labelledBy="peer-request-sent-title"
        onClose={onClose}
        panelClassName={panelClassName}
      >
        <RequestSent mentor={mentor} request={form.sent} onClose={onClose} />
      </ModalDialog>
    );
  }

  return (
    <ModalDialog
      key="form"
      labelledBy="peer-request-title"
      onClose={onClose}
      panelClassName={panelClassName}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="peer-request-title" className="type-h3 text-text-primary">
            {t("title")}
          </h2>
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            onClick={onClose}
            aria-label={t("close")}
          >
            <X aria-hidden className="size-4" strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-background-subtle px-4 py-3">
          <InitialsAvatar name={mentor.fullName} size="sm" />
          <div className="min-w-0">
            <p className="type-label text-text-primary">{mentor.fullName}</p>
            <p className="type-body-sm text-text-muted">
              {[t("role"), mentor.department].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-labelledby="peer-request-category"
          className="flex flex-col gap-2"
        >
          <p
            id="peer-request-category"
            className="type-label text-text-primary"
          >
            {t("category")}{" "}
            <span aria-hidden className="text-text-accent">
              *
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {mentor.categories.map((category) => (
              <ToggleChip
                key={category}
                label={tTopic(category)}
                pressed={form.category === category}
                onToggle={() => form.setCategory(category)}
              />
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="type-label text-text-primary">{t("message")}</span>
          <textarea
            value={form.message}
            onChange={(event) => form.setMessage(event.target.value)}
            maxLength={form.maxLength}
            rows={4}
            aria-describedby="peer-request-counter"
            placeholder={t("messagePlaceholder")}
            className={`${fieldClass} py-3`}
          />
        </label>
        <p
          id="peer-request-counter"
          className="-mt-3 flex items-center gap-1.5 type-caption text-text-muted"
        >
          <Info aria-hidden className="size-3.5 shrink-0" />
          {t("counter", {
            min: form.minLength,
            length: form.messageLength,
            max: form.maxLength,
          })}
        </p>
        {form.error ? (
          <InlineAlert tone={StatusTone.Error} title={form.error} />
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border-default pt-5">
          <p className="min-w-0 flex-1 basis-48 type-body-sm text-text-muted">
            {t("note", { name: mentor.fullName })}
          </p>
          <Button variant={ButtonVariant.Ghost} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={form.isSending}>
            {form.isSending ? t("sending") : t("send")}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}

function RequestSent({
  mentor,
  request,
  onClose,
}: {
  mentor: PeerMentorCard;
  request: PeerMentoringRequest;
  onClose: () => void;
}) {
  const t = useTranslations("iaIskur.take.sent");
  const tTopic = useTranslations("peerTopics");
  const next = [
    { icon: Bell, text: t("next.answer", { name: mentor.fullName }) },
    { icon: CalendarDays, text: t("next.accepted") },
    { icon: RotateCcw, text: t("next.declined") },
  ];
  return (
    <div className="flex flex-col gap-5">
      <span className="grid size-14 place-items-center rounded-full bg-status-success-bg">
        <CircleCheck aria-hidden className="size-6 text-status-success-icon" />
      </span>
      <div className="flex flex-col items-start gap-3">
        <h2 id="peer-request-sent-title" className="type-h3 text-text-primary">
          {t("title")}
        </h2>
        <RequestStatusBadge status={request.status} />
      </div>
      <dl className="flex items-center justify-between gap-4 rounded-2xl bg-background-subtle px-4 py-3">
        <dt className="type-body-sm text-text-secondary">{t("topic")}</dt>
        <dd className="type-body-sm text-text-primary">
          {tTopic(request.category)}
        </dd>
      </dl>
      <section aria-labelledby="peer-request-next" className="space-y-3">
        <h3 id="peer-request-next" className="type-label text-text-primary">
          {t("nextTitle")}
        </h3>
        <ul className="space-y-2">
          {next.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2 type-body-sm text-text-secondary"
            >
              <Icon aria-hidden className="size-4 shrink-0 text-icon-default" />
              {text}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={ButtonVariant.Secondary} onClick={onClose}>
          {t("close")}
        </Button>
        <Button href={PEER_MENTORSHIPS_HREF} onClick={onClose}>
          {t("goToMine")}
        </Button>
      </div>
    </div>
  );
}
