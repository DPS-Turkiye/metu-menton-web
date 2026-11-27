"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { IskurTeamChangeRequest } from "@/components/iskur/team-change-request";
import { useIskurTeamReveal } from "@/hooks/use-iskur-team-reveal";
import type {
  IskurPersonRef,
  IskurRevealPlacement,
} from "@/interfaces/iskur-onboarding";
import { ISKUR_MESSAGES_HREF } from "@/lib/iskur-channels";
import {
  ISKUR_ONBOARDING_HREF,
  type IskurRevealGroup,
} from "@/lib/iskur-onboarding";

/**
 * 05 · Ekibin belli oldu (Figma 288:395) on the student's Ana Sayfa: the team as the coordinator placed it, who to
 * ask about what, and the channels the placement opened. Nothing for someone who is not an İŞKUR intern.
 */
export function IskurTeamReveal() {
  const t = useTranslations("iskurOnboarding.reveal");
  const team = useIskurTeamReveal();
  const reveal = team.reveal;
  if (!reveal) return null;
  if (!reveal.onboardingSubmitted) {
    // TEST UI: placeholder until the design team's screen; replace when it arrives.
    return (
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-1">
          <p className="type-title-card text-text-primary">
            {t("reminderTitle")}
          </p>
          <p className="type-body-sm text-text-secondary">
            {t("reminderBody")}
          </p>
        </div>
        <Button href={ISKUR_ONBOARDING_HREF}>{t("reminderAction")}</Button>
      </Card>
    );
  }
  const placement = team.placement;
  if (!placement) {
    // TEST UI: placeholder until the design team's screen; replace when it arrives.
    return (
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-1">
          <p className="type-title-card text-text-primary">
            {t("waitingTitle")}
          </p>
          <p className="type-body-sm text-text-secondary">{t("waitingBody")}</p>
        </div>
        <Button variant={ButtonVariant.Secondary} href={ISKUR_ONBOARDING_HREF}>
          {t("waitingAction")}
        </Button>
      </Card>
    );
  }
  return (
    <Reveal
      placement={placement}
      groups={team.groups}
      provisional={team.provisional}
      leads={team.leads}
    />
  );
}

function Reveal({
  placement,
  groups,
  provisional,
  leads,
}: {
  placement: IskurRevealPlacement;
  groups: IskurRevealGroup[];
  provisional: boolean;
  leads: boolean;
}) {
  const t = useTranslations("iskurOnboarding.reveal");
  const tDays = useTranslations("iskurOnboarding.days");
  const leader = placement.myLeader;
  const coordinator = placement.unit.coordinator;
  const intro = !provisional
    ? t("introFinal")
    : leads
      ? t("introLeader")
      : leader
        ? t("introMember", { leader: leader.fullName })
        : t("introNoLeader");

  return (
    <section
      aria-labelledby="iskur-reveal-title"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-3 rounded-card bg-background-selected p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            tone={provisional ? StatusTone.Warning : StatusTone.Success}
          >
            {provisional
              ? placement.trialWeek === null
                ? t("provisionalNoWeek")
                : t("provisional", { week: placement.trialWeek })
              : t("final")}
          </StatusBadge>
          <StatusBadge tone={StatusTone.Neutral}>
            {t("unitChip", { unit: placement.unit.name })}
          </StatusBadge>
        </div>
        <h2 id="iskur-reveal-title" className="type-h1 text-text-primary">
          {t("title", { team: placement.team.name })}
        </h2>
        <p className="type-body text-text-secondary">{intro}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex-1 type-h4 text-text-primary">
              {t("teamTitle", { count: placement.team.people.length })}
            </h3>
            {placement.commonDays.length > 0 ? (
              <p className="type-label-sm text-text-muted">
                {t("commonDays", {
                  days: placement.commonDays
                    .map((day) => tDays(`long.${day}`))
                    .join(", "),
                })}
              </p>
            ) : null}
          </div>
          {groups.map((group) => (
            <div
              key={group.leader?.userId ?? "unled"}
              className="flex flex-col gap-3 rounded-[12px] bg-background-subtle p-4"
            >
              {group.leader ? (
                <div className="flex items-center gap-3">
                  <InitialsAvatar
                    personId={group.leader.userId}
                    name={group.leader.fullName}
                    large
                  />
                  <div className="flex flex-col">
                    <p className="type-label text-text-primary">
                      {group.leader.me
                        ? t("me", { name: group.leader.fullName })
                        : group.leader.fullName}
                    </p>
                    <p className="type-caption text-text-muted">
                      {t("leaderLine", { count: group.members.length })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="type-label text-text-primary">{t("unled")}</p>
              )}
              <ul className="flex flex-wrap gap-4">
                {group.members.map((member) => (
                  <li key={member.userId} className="flex items-center gap-2">
                    <InitialsAvatar
                      personId={member.userId}
                      name={member.fullName}
                      large
                    />
                    <span
                      className={`type-body-sm ${member.me ? "text-text-primary" : "text-text-secondary"}`}
                    >
                      {member.me
                        ? t("me", { name: member.fullName })
                        : member.fullName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>

        <div className="flex flex-col gap-6 lg:w-[420px] lg:shrink-0">
          <Card className="flex flex-col gap-3">
            <h3 className="type-h4 text-text-primary">{t("ask")}</h3>
            <Ask
              question={t("askDaily")}
              person={leader}
              who={(name) => t("askDailyWho", { name })}
            />
            <Ask
              question={t("askOtherTeam")}
              person={leader}
              who={(name) => t("askOtherTeamWho", { name })}
            />
            <Ask
              question={t("askAttendance")}
              person={coordinator}
              coordinator
              who={(name) => t("askAttendanceWho", { name })}
            />
            <Ask
              question={t("askPersonal")}
              person={coordinator}
              coordinator
              who={(name) => t("askPersonalWho", { name })}
            />
            <Ask
              question={t("askMentoring")}
              person={null}
              who={() => null}
              nobody={t("askMentoringWho")}
            />
          </Card>
          <Card className="flex flex-col gap-1">
            <h3 className="type-h4 text-text-primary">{t("channels")}</h3>
            {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
            <p className="type-body-sm text-text-secondary">
              {t("channelsOpen")}
            </p>
            <div className="mt-2">
              <Button
                href={ISKUR_MESSAGES_HREF}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Small}
              >
                {t("channelsAction")}
              </Button>
            </div>
          </Card>
          <IskurTeamChangeRequest />
        </div>
      </div>
    </section>
  );
}

function Ask({
  question,
  person,
  who,
  coordinator = false,
  nobody,
}: {
  question: string;
  person: IskurPersonRef | null;
  who: (name: string) => ReactNode;
  coordinator?: boolean;
  /** Shown instead of a name when the line names a role, not a person. */
  nobody?: string;
}) {
  const t = useTranslations("iskurOnboarding.reveal");
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-border-subtle p-3">
      {person ? (
        <InitialsAvatar personId={person.userId} name={person.fullName} large />
      ) : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="type-label text-text-primary">{question}</p>
        <p className="type-caption text-text-muted">
          {person
            ? who(person.fullName)
            : (nobody ?? t(coordinator ? "noCoordinator" : "noLeader"))}
        </p>
      </div>
    </div>
  );
}
