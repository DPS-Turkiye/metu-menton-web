"use client";

import { AlarmClock, Check, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { ChipSelect, ToggleChip } from "@/components/ia/filter-chip";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import { Chip, SectionHeader } from "@/components/student/ia/ui";
import { InitialsAvatar, Tag, TagTone } from "@/components/student/iskur-ui";
import { usePeerMentorDirectory } from "@/hooks/use-peer-mentoring";
import {
  PeerTopicCategory,
  type PeerMentorCard,
} from "@/interfaces/peer-mentoring";
import { isEnumValue } from "@/lib/enum";
import {
  hasPeerMentorBadge,
  peerMentorProfileHref,
} from "@/lib/peer-mentoring";
import { peerMentorHref } from "@/lib/peer-profile-links";
import { initials } from "@/lib/utils";
import { PeerRequestAvailability } from "@/types/iskur-student";

/** Mentorluk al › Keşfet (Figma 4.1): search and filters, the recommended mentors, then everyone. */
export function PeerMentorDirectory({
  focusSearch = false,
  onSearchFocused,
}: {
  /** "Başka mentor bul" lands here: put the student in the search box. */
  focusSearch?: boolean;
  onSearchFocused?: () => void;
}) {
  const t = useTranslations("iaIskur.take.discover");
  const tTopic = useTranslations("peerTopics");
  const tSubTopic = useTranslations("studentProfileCompletion.subtopics");
  const directory = usePeerMentorDirectory();
  const mentors = directory.mentors.data;
  const search = useRef<HTMLInputElement>(null);
  const focused = useRef(onSearchFocused);

  useEffect(() => {
    focused.current = onSearchFocused;
  });

  useEffect(() => {
    if (!focusSearch) return;
    search.current?.focus();
    focused.current?.();
  }, [focusSearch]);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-64 flex-1 sm:max-w-[360px]">
          <span className="sr-only">{t("search")}</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-icon-muted"
            strokeWidth={1.5}
          />
          <input
            ref={search}
            type="search"
            value={directory.query}
            onChange={(event) => directory.setQuery(event.target.value)}
            placeholder={t("search")}
            className="h-12 w-full rounded-input border border-border-control bg-background-surface pr-4 pl-11 type-body text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-selected"
          />
        </label>
        <ChipSelect
          label={t("categoryFilter")}
          value={directory.category ?? ""}
          options={[
            { value: "", label: t("categoryFilter") },
            ...directory.categories.map((category) => ({
              value: category,
              label: tTopic(category),
            })),
          ]}
          onChange={(value) =>
            directory.setCategory(
              isEnumValue(PeerTopicCategory, value) ? value : null,
            )
          }
        />
        {directory.subTopicOptions.length > 0 ? (
          <ChipSelect
            label={t("subTopicFilter")}
            value={directory.subTopic ?? ""}
            options={[
              { value: "", label: t("subTopicFilter") },
              ...directory.subTopicOptions.map((sub) => ({
                value: sub.id,
                label: tSubTopic(sub.labelKey),
              })),
            ]}
            onChange={(value) => directory.setSubTopic(value || null)}
          />
        ) : null}
        <ToggleChip
          label={t("availableThisWeek")}
          pressed={directory.availableThisWeek}
          onToggle={directory.toggleAvailableThisWeek}
        />
      </div>
      {directory.noActiveCategories ? (
        <InlineAlert tone={StatusTone.Info}>{t("noCategories")}</InlineAlert>
      ) : (
        <div className="flex flex-col gap-2">
          {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
          <p id="peer-category-filter" className="type-caption text-text-muted">
            {t("categoryChipsLabel")}
          </p>
          <div
            role="group"
            aria-labelledby="peer-category-filter"
            className="flex flex-wrap gap-2"
          >
            <ToggleChip
              label={t("allCategories")}
              pressed={directory.category === null}
              onToggle={() => directory.setCategory(null)}
            />
            {directory.categories.map((category) => {
              const count = directory.countOf(category);
              return (
                <ToggleChip
                  key={category}
                  pressed={directory.category === category}
                  onToggle={() => directory.toggleCategory(category)}
                  label={
                    <span>
                      {tTopic(category)}
                      {count === undefined ? null : (
                        <>
                          <span aria-hidden>{` · ${String(count)}`}</span>
                          <span className="sr-only">
                            {t("mentorCountSuffix", { count })}
                          </span>
                        </>
                      )}
                    </span>
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {directory.recommended.length > 0 ? (
        <section
          aria-labelledby="peer-recommended-title"
          className="flex flex-col gap-5"
        >
          <SectionHeader
            id="peer-recommended-title"
            title={t("recommendedTitle")}
            hint={t("recommendedHint")}
          />
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {directory.recommended.map((mentor) => (
              <li key={mentor.mentorId}>
                <RecommendedCard
                  mentor={mentor}
                  reasons={directory.reasonsOf(mentor)}
                  availability={directory.availabilityOf(mentor)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="peer-all-title" className="flex flex-col gap-5">
        <SectionHeader
          id="peer-all-title"
          title={t("allTitle")}
          hint={
            mentors && mentors.length > 0
              ? t("mentorCount", { count: mentors.length })
              : undefined
          }
        />
        <QueryNotice
          isLoading={directory.mentors.isLoading}
          error={directory.mentors.error}
        />
        {mentors?.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-default p-6 type-body text-text-secondary">
            {directory.filtered ? t("noMatch") : t("empty")}
          </p>
        ) : null}
        {directory.others.length > 0 ? (
          <ul className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface">
            {directory.others.map((mentor) => (
              <li
                key={mentor.mentorId}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
              >
                <MentorHeading mentor={mentor} />
                {mentor.categories.length > 0 ? (
                  <p className="flex flex-wrap gap-1.5">
                    {mentor.categories.map((category) => (
                      <Chip key={category}>{tTopic(category)}</Chip>
                    ))}
                  </p>
                ) : null}
                <div className="lg:w-48">
                  <AvailabilityLine
                    mentor={mentor}
                    availability={directory.availabilityOf(mentor)}
                  />
                </div>
                <Button
                  href={peerMentorProfileHref(mentor.mentorId)}
                  variant={ButtonVariant.Ghost}
                  size={ButtonSize.Small}
                >
                  {t("seeProfile")}
                  <NameSuffix name={mentor.fullName} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function RecommendedCard({
  mentor,
  reasons,
  availability,
}: {
  mentor: PeerMentorCard;
  reasons: readonly string[];
  availability: PeerRequestAvailability;
}) {
  const t = useTranslations("iaIskur.take.discover");
  const open = availability === PeerRequestAvailability.Open;
  return (
    <article
      aria-label={mentor.fullName}
      className="flex h-full flex-col gap-3.5 rounded-2xl border border-border-default bg-background-surface p-5"
    >
      <div className="flex items-center py-4 sm:px-5">
        <MentorHeading mentor={mentor} large />
      </div>
      {hasPeerMentorBadge(mentor.badges) ? (
        <div>
          <Tag tone={TagTone.Success}>
            {t("trained")}
            <Check aria-hidden className="ml-1 size-3.5" />
          </Tag>
        </div>
      ) : null}
      <WhyRecommended reasons={reasons} />
      <div className="mt-auto flex flex-col gap-3.5">
        <AvailabilityLine mentor={mentor} availability={availability} />
        <Button
          href={peerMentorProfileHref(mentor.mentorId)}
          variant={open ? ButtonVariant.Secondary : ButtonVariant.Ghost}
          fullWidth
        >
          {open ? t("seeProfileAndRequest") : t("seeProfile")}
          <NameSuffix name={mentor.fullName} />
        </Button>
      </div>
    </article>
  );
}

/** Avatar, name and "bölüm · sınıf". */
function MentorHeading({
  mentor,
  large = false,
}: {
  mentor: PeerMentorCard;
  large?: boolean;
}) {
  const t = useTranslations("iaIskur.take.discover");
  return (
    <div className="flex min-w-0 flex-1 basis-56 items-center gap-4">
      <ProfilePictureLink
        href={peerMentorHref(mentor.mentorId)}
        name={mentor.fullName}
      >
        <InitialsAvatar
          initials={initials(mentor.fullName)}
          size={large ? "profile" : "md"}
        />
      </ProfilePictureLink>
      <div className="min-w-0">
        <h3
          className={`truncate text-text-primary ${large ? "type-label-lg" : "type-label"}`}
        >
          {mentor.fullName}
        </h3>
        <p className="type-body-sm text-text-muted">
          {[
            mentor.department,
            mentor.classYear
              ? t("classYear", { year: mentor.classYear })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

/** Whether this mentor has a free hour this week, or why no request can be sent to them. */
export function AvailabilityLine({
  mentor,
  availability = PeerRequestAvailability.Open,
}: {
  mentor: PeerMentorCard;
  /** Left out where the request button already says why it can't be sent. */
  availability?: PeerRequestAvailability | undefined;
}) {
  const t = useTranslations("iaIskur.take.discover");
  const closed = {
    [PeerRequestAvailability.Open]: null,
    [PeerRequestAvailability.Requested]: t("requested"),
    [PeerRequestAvailability.Mentoring]: t("mentoring"),
    [PeerRequestAvailability.Paused]: t("paused"),
    [PeerRequestAvailability.Full]: t("capacityFull"),
  }[availability];
  const free = closed === null && mentor.availableThisWeek;
  const Icon = free ? AlarmClock : X;
  return (
    <p
      className={`flex items-center gap-1.5 type-body-sm ${free ? "text-status-success-text" : "text-text-muted"}`}
    >
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
      {closed ?? (free ? t("freeThisWeek") : t("noFreeThisWeek"))}
    </p>
  );
}

/** The "Neden önerildi" box. */
export function WhyRecommended({ reasons }: { reasons: readonly string[] }) {
  const t = useTranslations("iaIskur.take.discover");
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-background-subtle px-3.5 py-3">
      <p className="type-label-sm text-text-secondary">{t("why")}</p>
      <ul className="flex flex-col gap-1.5">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="flex items-start gap-2 type-body-sm text-text-secondary"
          >
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-icon-default"
              strokeWidth={1.5}
            />
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Mentorluk talebi gönder", or why it can't be sent now (an open request, no places left). */
export function RequestButton({
  mentor,
  availability,
  onRequest,
}: {
  mentor: PeerMentorCard;
  availability: PeerRequestAvailability;
  onRequest: () => void;
}) {
  const t = useTranslations("iaIskur.take.discover");
  if (availability === PeerRequestAvailability.Open) {
    return (
      <Button size={ButtonSize.Large} onClick={onRequest} fullWidth>
        {t("request")}
        <NameSuffix name={mentor.fullName} />
      </Button>
    );
  }
  return (
    <Button size={ButtonSize.Large} disabled fullWidth>
      {availability === PeerRequestAvailability.Mentoring
        ? t("mentoring")
        : availability === PeerRequestAvailability.Requested
          ? t("requested")
          : availability === PeerRequestAvailability.Paused
            ? t("paused")
            : t("full")}
    </Button>
  );
}

/**
 * The mentor's name after a repeated button's visible text, for screen readers only; the visible text stays first in
 * the accessible name, so voice control can still say "Profili gör".
 */
export function NameSuffix({ name }: { name: string }) {
  const t = useTranslations("iaIskur.take.discover");
  return <span className="sr-only">{t("nameSuffix", { name })}</span>;
}
