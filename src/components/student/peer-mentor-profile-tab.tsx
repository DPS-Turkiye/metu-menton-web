"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { Toggle } from "@/components/ia/toggle";
import { InitialsAvatar, Tag, TagTone } from "@/components/student/iskur-ui";
import { PeerCapacityBar } from "@/components/student/peer-capacity-card";
import { PeerMentorPreview } from "@/components/student/peer-mentor-preview";
import { PeerProfileStatus } from "@/components/student/peer-mentor-requests-tab";
import {
  usePeerMentorPreviewPerson,
  type PeerGivePublished,
} from "@/hooks/use-peer-mentor-give";
import {
  usePeerMentorHours,
  usePeerMentorIntake,
  usePeerMentorSubTopics,
} from "@/hooks/use-peer-mentor-tabs";
import type { PeerMentorProfile } from "@/interfaces/peer-mentoring";
import { PEER_MENTOR_WIZARD_HREF } from "@/lib/peer-mentoring";
import { PeerGiveTab } from "@/types/iskur-student";

/** Mentor profilim (Figma 7.7): the published profile, the weekly hours and the capacity. */
export function PeerMentorProfileTab({
  view,
  profile,
}: {
  view: PeerGivePublished;
  profile: PeerMentorProfile;
}) {
  const t = useTranslations("iaIskur.give.profile.protected");
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <ProfileCard profile={profile} capacity={view.menteeCapacity} />
        <HoursCard onEdit={() => view.setTab(PeerGiveTab.Availability)} />
      </div>
      <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
        <IntakeCard view={view} profile={profile} />
        <InlineAlert tone={StatusTone.Info} title={t("title")}>
          {t("body")}
        </InlineAlert>
      </aside>
    </div>
  );
}

function ProfileCard({
  profile,
  capacity,
}: {
  profile: PeerMentorProfile;
  capacity: number | null;
}) {
  const t = useTranslations("iaIskur.give.profile");
  const tTopic = useTranslations("peerTopics");
  const person = usePeerMentorPreviewPerson();
  const [previewing, setPreviewing] = useState(false);
  return (
    <Card labelledBy="peer-own-profile" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 sm:px-5 sm:py-4">
        <InitialsAvatar initials={person.initials} size="profile" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="peer-own-profile" className="type-h4 text-text-primary">
            {person.fullName}
          </h2>
          <p className="type-body-sm text-text-muted">
            {person.department}
            {person.showSeparator ? " · " : null}
            {person.classYear
              ? t("classYear", { classYear: person.classYear })
              : null}
          </p>
        </div>
        <PeerProfileStatus accepting={profile.acceptingRequests} />
      </div>
      <ul className="flex flex-wrap gap-2">
        {profile.categories.map((category) => (
          <li key={category}>
            <Tag>{tTopic(category)}</Tag>
          </li>
        ))}
        {person.badgeVerified ? (
          <li>
            <Tag tone={TagTone.Success}>{t("badge")}</Tag>
          </li>
        ) : null}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button
          href={PEER_MENTOR_WIZARD_HREF}
          variant={ButtonVariant.Secondary}
        >
          <Image alt="" src="/ia/icons/edit.svg" width={20} height={20} />
          {t("edit")}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          className="text-text-accent!"
          onClick={() => setPreviewing(true)}
        >
          {t("preview")}
        </Button>
      </div>
      {previewing ? (
        <PreviewDialog
          profile={profile}
          capacity={capacity}
          onClose={() => setPreviewing(false)}
        />
      ) : null}
    </Card>
  );
}

function PreviewDialog({
  profile,
  capacity,
  onClose,
}: {
  profile: PeerMentorProfile;
  capacity: number | null;
  onClose: () => void;
}) {
  const t = useTranslations("iaIskur.give.profile");
  const { hours } = usePeerMentorHours();
  const subTopics = usePeerMentorSubTopics(profile.subTopics);
  return (
    <ModalDialog
      labelledBy="peer-preview-title"
      onClose={onClose}
      panelClassName="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-[28px] bg-background-surface p-7 shadow-modal outline-none"
    >
      <div className="flex flex-col gap-6">
        <h2 id="peer-preview-title" className="type-h3 text-text-primary">
          {t("previewTitle")}
        </h2>
        <PeerMentorPreview
          topics={profile.categories}
          subTopics={subTopics}
          helpWith={profile.helpWith}
          experiences={profile.experiences}
          hours={hours}
          capacity={capacity}
        />
        <Button
          variant={ButtonVariant.Ghost}
          className="self-end"
          onClick={onClose}
        >
          {t("close")}
        </Button>
      </div>
    </ModalDialog>
  );
}

function HoursCard({ onEdit }: { onEdit: () => void }) {
  const t = useTranslations("iaIskur.give.profile.hours");
  const tDay = useTranslations("options.weekday");
  const view = usePeerMentorHours();
  return (
    <section
      aria-labelledby="peer-own-hours"
      className="rounded-card border border-border-default bg-background-surface px-6 py-2"
    >
      <div className="flex items-center gap-2 py-3.5">
        <h2
          id="peer-own-hours"
          className="min-w-0 flex-1 type-label-lg text-text-primary"
        >
          {t("title")}
        </h2>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Small}
          onClick={onEdit}
        >
          <Image alt="" src="/ia/icons/edit.svg" width={16} height={16} />
          {t("edit")}
        </Button>
      </div>
      <QueryNotice isLoading={view.isLoading} error={view.error} />
      {view.minutes === null ? null : (
        <dl className="divide-y divide-border-default border-t border-border-default">
          {view.days.length === 0 ? (
            <div className="py-3 type-body text-text-secondary">
              <dt className="sr-only">{t("title")}</dt>
              <dd>{t("none")}</dd>
            </div>
          ) : null}
          {view.days.map(({ days, ranges }) => (
            <HoursRow
              key={days.join()}
              label={days.map((day) => tDay(day)).join(", ")}
            >
              {ranges
                .map(({ start, end }) => t("range", { start, end }))
                .join(", ")}
            </HoursRow>
          ))}
          {view.closedDays.map((closed) => (
            <HoursRow key={closed} label={t("closed")}>
              {closed}
            </HoursRow>
          ))}
          <HoursRow label={t("duration")}>
            {t("minutes", { minutes: view.minutes })}
          </HoursRow>
        </dl>
      )}
    </section>
  );
}

function HoursRow({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-40 shrink-0 type-body text-text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 type-label text-text-primary">
        {children}
      </dd>
    </div>
  );
}

const STEP_BUTTON =
  "grid h-9 w-10 place-items-center rounded-button-sm bg-action-secondary-bg text-action-secondary-fg hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected disabled:bg-background-disabled disabled:text-text-disabled";

function IntakeCard({
  view,
  profile,
}: {
  view: PeerGivePublished;
  profile: PeerMentorProfile;
}) {
  const t = useTranslations("iaIskur.give.profile.intake");
  const { capacity } = view;
  const intake = usePeerMentorIntake(profile, view.menteeCapacity);
  return (
    <Card
      labelledBy="peer-own-capacity"
      className="flex flex-col items-start gap-3.5"
    >
      <h2 id="peer-own-capacity" className="type-label-lg text-text-primary">
        {t("title")}
      </h2>
      {capacity ? (
        <>
          <p className="flex items-end gap-1.5">
            <span className="type-metric text-text-primary">
              {capacity.used}
            </span>
            <span className="type-body text-text-secondary">
              {capacity.capacity === null
                ? t("noLimit")
                : t("ofCapacity", {
                    capacity: capacity.capacity,
                    free: capacity.capacity - capacity.filled,
                  })}
            </span>
          </p>
          <PeerCapacityBar capacity={capacity} label={t("title")} />
        </>
      ) : null}
      <div className="flex items-center gap-3">
        <span className="type-body-sm text-text-secondary">{t("limit")}</span>
        <button
          type="button"
          aria-label={t("decrease")}
          disabled={!intake.canDecrease || intake.isSaving}
          onClick={intake.decrease}
          className={STEP_BUTTON}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <span aria-live="polite" className="type-metric-sm text-text-primary">
          {view.menteeCapacity ?? t("unset")}
        </span>
        <button
          type="button"
          aria-label={t("increase")}
          disabled={!intake.canIncrease || intake.isSaving}
          onClick={intake.increase}
          className={STEP_BUTTON}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      <Toggle
        label={t("accepting")}
        checked={profile.acceptingRequests}
        disabled={intake.isSaving}
        onChange={intake.setAccepting}
      />
      <p className="type-caption text-text-muted">{t("hint")}</p>
    </Card>
  );
}
