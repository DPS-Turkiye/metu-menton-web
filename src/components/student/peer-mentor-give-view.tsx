"use client";

import { ExternalLink, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { WeeklyAvailabilityEditor } from "@/components/availability/weekly-availability-editor";
import { Button, ButtonSize } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import {
  JourneySteps,
  TabLook,
  TabPanel,
  UnderlineTabs,
} from "@/components/student/iskur-ui";
import { PeerMenteesTab } from "@/components/student/peer-mentees-tab";
import { PeerMentorHoursEditor } from "@/components/student/peer-mentor-hours-editor";
import { PeerMentorProfileTab } from "@/components/student/peer-mentor-profile-tab";
import { PeerMentorRequestsTab } from "@/components/student/peer-mentor-requests-tab";
import { ActivityReportView } from "@/components/student/reports/activity-report-view";
import { useMentorDutyHours } from "@/hooks/use-mentor-duty-hours";
import { useAvailabilitySettingsForm } from "@/hooks/use-mentor-profile";
import {
  usePeerGivePublished,
  usePeerMentorGate,
  usePeerMentorProfile,
  usePeerMentorTrainingEntry,
} from "@/hooks/use-peer-mentor-give";
import {
  PeerMentorGateState,
  type PeerMentorProfile,
} from "@/interfaces/peer-mentoring";
import { PEER_MENTOR_WIZARD_HREF } from "@/lib/peer-mentoring";
import {
  PeerBadgeProgress,
  PeerGiveTab,
  PeerMentorJourneyStep,
} from "@/types/iskur-student";

const TABS_ID = "peer-give";
const JOURNEY = [
  PeerMentorJourneyStep.EarnBadge,
  PeerMentorJourneyStep.BadgeVerified,
  PeerMentorJourneyStep.CreateProfile,
  PeerMentorJourneyStep.Published,
] as const;

/** Akran Mentörlüğü › Mentorluk Ver, by where the student stands with the Akran Mentoru badge. */
export function PeerMentorGiveView() {
  const t = useTranslations("iaIskur.give");
  const gate = usePeerMentorGate();

  if (gate.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (gate.state === PeerMentorGateState.NoBadge) return <NoBadgeView />;
  if (gate.state === PeerMentorGateState.Revoked) {
    return (
      <Featured
        title={gate.expired ? t("revoked.expiredTitle") : t("revoked.title")}
        body={t("revoked.body")}
      >
        {gate.gateAward?.reason ? (
          <p className="type-body text-text-secondary">
            {t("revoked.reason", { reason: gate.gateAward.reason })}
          </p>
        ) : null}
      </Featured>
    );
  }
  if (gate.state === PeerMentorGateState.Earned) {
    return <EarnedView sessionBehind={gate.sessionBehind} />;
  }
  return null;
}

const BADGE_STATUSES = [
  {
    key: "todo",
    tone: StatusTone.Neutral,
    progress: [PeerBadgeProgress.Todo, PeerBadgeProgress.Retake],
  },
  {
    key: "pending",
    tone: StatusTone.Warning,
    progress: [PeerBadgeProgress.Pending],
  },
  { key: "verified", tone: StatusTone.Success, progress: [] },
] as const satisfies readonly {
  key: string;
  tone: StatusTone;
  progress: readonly PeerBadgeProgress[];
}[];

/** Rozet yok (Figma 6.2): the training, the steps to becoming a mentor and where the badge stands. */
function NoBadgeView() {
  const t = useTranslations("iaIskur.give.noBadge");
  const entry = usePeerMentorTrainingEntry();
  const current =
    entry.progress === PeerBadgeProgress.Pending
      ? PeerMentorJourneyStep.BadgeVerified
      : PeerMentorJourneyStep.EarnBadge;
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <h2 className="type-h2 text-text-primary">{t("title")}</h2>
          <p className="type-body-lg text-text-secondary">{t("body")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {entry.href ? (
              <Button href={entry.href} size={ButtonSize.Large}>
                <ExternalLink aria-hidden className="size-5" />
                {t("training")}
              </Button>
            ) : (
              <Button size={ButtonSize.Large} disabled>
                {t("training")}
              </Button>
            )}
            <p className="type-body-sm text-text-muted">
              {entry.reason
                ? t(`trainingReason.${entry.reason}`)
                : t("trainingHint")}
            </p>
          </div>
        </div>
        <ol
          aria-label={t("stepsLabel")}
          className="divide-y divide-border-default rounded-card border border-border-default bg-background-surface px-6 py-2"
        >
          {JOURNEY.map((step, index) => {
            const active = step === current;
            return (
              <li
                key={step}
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-3.5 py-3"
              >
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full type-label-sm ${
                    active
                      ? "bg-background-selected text-text-accent"
                      : "bg-background-muted text-text-secondary"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex flex-col">
                  <span
                    className={`type-label-lg ${active ? "text-text-primary" : "text-text-secondary"}`}
                  >
                    {t(`steps.${step}.title`)}
                  </span>
                  <span
                    className={`type-body-sm ${active ? "text-text-accent" : "text-text-muted"}`}
                  >
                    {active ? t("youAreHere") : t(`steps.${step}.hint`)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
        <BadgeStatus progress={entry.progress} />
        <ul className="flex flex-col gap-3">
          {(["badgeMissing", "oneAccount", "keepGetting"] as const).map(
            (note) => (
              <li
                key={note}
                className="flex items-start gap-2.5 type-body-sm text-text-muted"
              >
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t(`notes.${note}`)}
              </li>
            ),
          )}
        </ul>
      </aside>
    </div>
  );
}

function BadgeStatus({ progress }: { progress: PeerBadgeProgress }) {
  const t = useTranslations("iaIskur.give.noBadge.status");
  return (
    <Card
      compact
      labelledBy="peer-badge-status"
      className="flex flex-col gap-4"
    >
      <h3 id="peer-badge-status" className="type-label-lg text-text-primary">
        {t("title")}
      </h3>
      <ul className="flex flex-col gap-3">
        {BADGE_STATUSES.map((status) => {
          const current = status.progress.some((step) => step === progress);
          return (
            <li
              key={status.key}
              aria-current={current ? "true" : undefined}
              className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 ${
                current
                  ? "border-border-control bg-background-subtle"
                  : "border-transparent"
              }`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={status.tone}>
                  {t(`${status.key}.label`)}
                </StatusBadge>
                {current ? (
                  <span className="type-caption text-text-accent">
                    {t("current")}
                  </span>
                ) : null}
              </span>
              <span className="type-body-sm text-text-muted">
                {current && progress === PeerBadgeProgress.Retake
                  ? t("todo.retake")
                  : t(`${status.key}.body`)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** The featured (tinted) panel: certificate icon, title, body and actions, with an optional side column. */
function Featured({
  title,
  body,
  children,
  aside,
}: {
  title: string;
  body: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-8 rounded-featured border border-card-featured-border bg-card-featured-bg p-6 sm:p-10 lg:flex-row lg:items-center lg:gap-12"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-background-surface">
          <Image
            src="/ia/iskur/certificate.svg"
            alt=""
            width={28}
            height={28}
          />
        </span>
        <div className="space-y-2.5">
          <h2 className="type-h2 text-text-primary">{title}</h2>
          <p className="max-w-[620px] type-body-lg text-text-secondary">
            {body}
          </p>
        </div>
        {children}
      </div>
      {aside}
    </section>
  );
}

function Journey({
  current,
  title,
  body,
  children,
}: {
  current: PeerMentorJourneyStep;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const t = useTranslations("iaIskur.give.journey");
  return (
    <Featured
      title={title}
      body={body}
      aside={
        <JourneySteps
          heading={t("heading")}
          currentKey={current}
          steps={JOURNEY.map((step) => ({
            key: step,
            title: t(`${step}.title`),
            hint: step === current ? t("youAreHere") : t(`${step}.hint`),
          }))}
        />
      }
    >
      {children}
    </Featured>
  );
}

function EarnedView({ sessionBehind }: { sessionBehind: boolean }) {
  const t = useTranslations("iaIskur.give.earned");
  const profile = usePeerMentorProfile(!sessionBehind);

  if (sessionBehind) {
    return (
      <Journey
        current={PeerMentorJourneyStep.BadgeVerified}
        title={t("title")}
        body={t("signInAgain")}
      />
    );
  }
  if (profile.isLoading || profile.error) {
    return <QueryNotice isLoading={profile.isLoading} error={profile.error} />;
  }
  if (!profile.data) {
    return (
      <Journey
        current={PeerMentorJourneyStep.CreateProfile}
        title={t("title")}
        body={t("body")}
      >
        <Button href={PEER_MENTOR_WIZARD_HREF} size={ButtonSize.Large}>
          {t("createProfile")}
        </Button>
      </Journey>
    );
  }
  return <PublishedView profile={profile.data} />;
}

function PublishedView({ profile }: { profile: PeerMentorProfile }) {
  const t = useTranslations("iaIskur.give.tabs");
  const tReports = useTranslations("iaIskurReports.give");
  const view = usePeerGivePublished(profile.menteeCapacity);
  const { received, loaded } = view;
  // Every panel stays mounted (TabPanel), so an unsaved draft survives a look at another tab.
  const tabs = [
    {
      id: PeerGiveTab.Requests,
      label: t("requests"),
      count: loaded ? received.waiting.length : undefined,
      panel: <PeerMentorRequestsTab view={view} profile={profile} />,
    },
    {
      id: PeerGiveTab.Mentees,
      label: t("mentees"),
      count: loaded ? received.mentees.length : undefined,
      panel: <PeerMenteesTab view={view} />,
    },
    {
      id: PeerGiveTab.Report,
      label: tReports("reportTab"),
      panel: <ActivityReportView />,
    },
    {
      id: PeerGiveTab.Availability,
      label: t("availability"),
      panel: <AvailabilityPanel />,
    },
    {
      id: PeerGiveTab.Profile,
      label: t("profile"),
      panel: <PeerMentorProfileTab view={view} profile={profile} />,
    },
  ];

  return (
    <div className="space-y-6">
      <UnderlineTabs
        label={t("label")}
        idPrefix={TABS_ID}
        look={TabLook.Segment}
        selected={view.tab}
        onSelect={view.setTab}
        tabs={tabs.map(({ id, label, count }) => ({
          id,
          label,
          ...(count === undefined ? {} : { count }),
        }))}
      />
      {tabs.map(({ id, panel }) => (
        <TabPanel
          key={id}
          idPrefix={TABS_ID}
          id={id}
          selected={view.tab === id}
        >
          {panel}
        </TabPanel>
      ))}
    </div>
  );
}

function AvailabilityPanel() {
  const t = useTranslations("iaIskur.give.availability");
  const tHours = useTranslations("iaIskur.hours");
  const hours = useMentorDutyHours();
  const availability = useAvailabilitySettingsForm(() => undefined, {
    check: hours.check,
    suggestion: hours.suggestion,
  });
  const save = (
    <Button
      disabled={!availability.draft || availability.isSaving}
      onClick={() => void availability.save()}
    >
      {availability.isSaving ? t("saving") : t("save")}
    </Button>
  );
  // Until the work hours are known, neither editor: the plain one would not check them.
  if (hours.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {tHours("loading")}
      </p>
    );
  }
  if (hours.duty.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <WeeklyAvailabilityEditor editor={availability} />
        <div>{save}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <p className="type-body text-text-secondary">{tHours("intro")}</p>
      <PeerMentorHoursEditor editor={availability} hours={hours} />
      <div>{save}</div>
    </div>
  );
}
