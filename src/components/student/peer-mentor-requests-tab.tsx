"use client";

import { useTranslations } from "next-intl";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { ToggleChip } from "@/components/ia/filter-chip";
import {
  STATUS_DOT_ICON,
  StatusPill,
  StatusTone,
} from "@/components/ia/status-pill";
import { PeerCapacityCard } from "@/components/student/peer-capacity-card";
import { PeerRequestCard } from "@/components/student/peer-request-card";
import type { PeerGivePublished } from "@/hooks/use-peer-mentor-give";
import {
  PEER_DECLINE_REASONS,
  usePeerMentorHours,
  usePeerRequestActions,
  type PeerRequestActions,
} from "@/hooks/use-peer-mentor-tabs";
import type {
  PeerMentoringRequest,
  PeerMentorProfile,
} from "@/interfaces/peer-mentoring";
import { PeerCapacityNote, PeerGiveTab } from "@/types/iskur-student";

/** Talepler (Figma 7.1): the requests waiting for an answer, with the capacity and the profile beside them. */
export function PeerMentorRequestsTab({
  view,
  profile,
}: {
  view: PeerGivePublished;
  profile: PeerMentorProfile;
}) {
  const t = useTranslations("iaIskur.give.requests");
  const actions = usePeerRequestActions();
  const { received, loaded, capacity } = view;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <section
        aria-labelledby="peer-waiting-requests"
        className="flex min-w-0 flex-1 flex-col gap-6"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 id="peer-waiting-requests" className="type-h4 text-text-primary">
            {t("title")}
          </h2>
          {loaded ? (
            <p className="type-body-sm text-text-muted">
              {t("order", { count: received.waiting.length })}
            </p>
          ) : null}
        </div>
        <QueryNotice
          isLoading={received.query.isLoading}
          error={received.query.error}
        />
        {loaded && received.waiting.length === 0 ? (
          <Card>
            <p className="type-body text-text-secondary">{t("empty")}</p>
          </Card>
        ) : null}
        {loaded && received.waiting.length > 0 ? (
          <ul className="space-y-6">
            {received.waiting.map((request, index) => (
              <li key={request.id}>
                <PeerRequestCard request={request}>
                  {actions.declining?.id === request.id ? (
                    <DeclineReasons actions={actions} />
                  ) : (
                    <RequestActions
                      request={request}
                      actions={actions}
                      first={index === 0}
                      capacityFull={view.capacityFull}
                      lastPlaceOf={
                        capacity?.note === PeerCapacityNote.LastPlace
                          ? capacity.capacity
                          : null
                      }
                    />
                  )}
                </PeerRequestCard>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <aside className="flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0">
        {capacity ? (
          <PeerCapacityCard
            capacity={capacity}
            onEdit={() => view.setTab(PeerGiveTab.Availability)}
          />
        ) : null}
        <ProfileSummary profile={profile} />
      </aside>
    </div>
  );
}

function RequestActions({
  request,
  actions,
  first,
  capacityFull,
  lastPlaceOf,
}: {
  request: PeerMentoringRequest;
  actions: PeerRequestActions;
  first: boolean;
  capacityFull: boolean;
  /** The limit, when accepting this request would fill it. */
  lastPlaceOf: number | null;
}) {
  const t = useTranslations("iaIskur.give.requests");
  const tReports = useTranslations("iaIskurReports.give");
  const pending = actions.pendingId === request.id;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <p className="min-w-[200px] flex-1 type-body-sm text-status-warning-text">
        {capacityFull
          ? tReports("capacityFull")
          : lastPlaceOf === null
            ? null
            : t("lastPlace", { capacity: lastPlaceOf })}
      </p>
      <Button
        variant={ButtonVariant.Secondary}
        disabled={pending}
        onClick={() => actions.startDecline(request.id)}
      >
        {t("decline")}
      </Button>
      <span data-tour={first ? "peer-request-accept" : undefined}>
        <Button
          disabled={capacityFull || pending}
          onClick={() => actions.accept(request.id)}
        >
          {t("accept")}
        </Button>
      </span>
    </div>
  );
}

function DeclineReasons({ actions }: { actions: PeerRequestActions }) {
  const t = useTranslations("iaIskur.give.requests.reason");
  return (
    <div
      role="group"
      aria-label={t("title")}
      className="flex flex-col gap-2.5 rounded-xl bg-background-subtle px-4 py-3.5"
    >
      <p aria-hidden className="type-label-sm text-text-secondary">
        {t("title")}
      </p>
      <div className="flex flex-wrap gap-2">
        {PEER_DECLINE_REASONS.map((reason) => (
          <ToggleChip
            key={reason}
            label={t(reason)}
            pressed={actions.declining?.reason === reason}
            onToggle={() => actions.chooseReason(reason)}
          />
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant={ButtonVariant.Ghost}
          size={ButtonSize.Small}
          onClick={actions.cancelDecline}
        >
          {t("cancel")}
        </Button>
        <Button
          variant={ButtonVariant.Destructive}
          size={ButtonSize.Small}
          onClick={actions.confirmDecline}
        >
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}

function ProfileSummary({ profile }: { profile: PeerMentorProfile }) {
  const t = useTranslations("iaIskur.give.profileCard");
  const tTopic = useTranslations("peerTopics");
  const tDay = useTranslations("iskurOnboarding.days.short");
  const { hours } = usePeerMentorHours();
  return (
    <section
      aria-labelledby="peer-profile-card-title"
      className="flex flex-col gap-2.5 rounded-2xl bg-background-subtle p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="peer-profile-card-title"
          className="type-label-lg text-text-primary"
        >
          {t("title")}
        </h2>
        <PeerProfileStatus accepting={profile.acceptingRequests} />
      </div>
      <p className="type-body-sm text-text-secondary">
        {[
          ...profile.categories.map((category) => tTopic(category)),
          ...(hours.length > 0
            ? [
                hours
                  .map(({ dayOfWeek, start, end }) =>
                    t("hours", { day: tDay(dayOfWeek), start, end }),
                  )
                  .join(", "),
              ]
            : []),
        ].join(" · ")}
      </p>
    </section>
  );
}

/** "Aktif" while the mentor takes new requests. */
export function PeerProfileStatus({ accepting }: { accepting: boolean }) {
  const t = useTranslations("iaIskur.give.profileCard");
  return (
    <StatusPill
      tone={accepting ? StatusTone.Success : StatusTone.Neutral}
      icon={STATUS_DOT_ICON}
    >
      {accepting ? t("active") : t("paused")}
    </StatusPill>
  );
}
