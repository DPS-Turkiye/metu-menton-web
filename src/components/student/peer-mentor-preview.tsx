"use client";

import { useTranslations } from "next-intl";

import { InitialsAvatar, Tag, TagTone } from "@/components/student/iskur-ui";
import { usePeerMentorPreviewPerson } from "@/hooks/use-peer-mentor-give";
import type {
  PeerExperienceCard,
  PeerTopicCategory,
} from "@/interfaces/peer-mentoring";
import type { ProfileCompletionCategory } from "@/interfaces/student-profile-completion";
import type { WeeklyHours } from "@/lib/peer-mentoring";

/** The signed-in mentor's profile as students see it: the wizard's last step, and "Öğrenci gözünden önizle" (7.7). */
export function PeerMentorPreview({
  topics,
  subTopics,
  helpWith,
  experiences,
  hours,
  capacity,
}: {
  topics: readonly PeerTopicCategory[];
  subTopics: readonly ProfileCompletionCategory["subtopics"][number][];
  helpWith: string;
  experiences: readonly PeerExperienceCard[];
  hours: readonly WeeklyHours[];
  capacity: number | null;
}) {
  const t = useTranslations("iaIskur.wizard.preview");
  const topicLabel = useTranslations("peerTopics");
  const subtopicLabel = useTranslations("studentProfileCompletion.subtopics");
  const dayLabel = useTranslations("options.weekday");
  const person = usePeerMentorPreviewPerson();

  return (
    <>
      <div className="flex flex-wrap items-center gap-5">
        <InitialsAvatar initials={person.initials} size="lg" />
        <div className="space-y-2">
          <h2 className="type-h2 text-text-primary">{person.fullName}</h2>
          <p className="type-body text-text-secondary">
            {person.department}
            {person.showSeparator ? " · " : null}
            {person.classYear
              ? t("classYear", { classYear: person.classYear })
              : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <Tag>{t("peer")}</Tag>
            {person.badgeVerified ? (
              <Tag tone={TagTone.Success}>{t("badgeVerified")}</Tag>
            ) : null}
          </div>
        </div>
      </div>
      <hr className="border-border-subtle" />
      <div className="space-y-3">
        <h3 className="type-label text-text-primary">{t("topics")}</h3>
        <ul className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <li key={topic}>
              <Tag tone={TagTone.Accent}>{topicLabel(topic)}</Tag>
            </li>
          ))}
          {subTopics.map((sub) => (
            <li key={sub.id}>
              <Tag tone={TagTone.Accent}>{subtopicLabel(sub.labelKey)}</Tag>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <h3 className="type-label text-text-primary">{t("helpWith")}</h3>
        <p className="type-body whitespace-pre-line text-text-secondary">
          {helpWith}
        </p>
      </div>
      {experiences.length > 0 ? (
        <div className="space-y-2">
          <h3 className="type-label text-text-primary">{t("experience")}</h3>
          <ul className="space-y-1">
            {experiences.map((card) => (
              <li
                key={`${card.title}-${card.startedOn ?? ""}`}
                className="type-body-sm text-text-secondary"
              >
                {card.organization
                  ? `${card.title} — ${card.organization}`
                  : card.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-1">
          <dt className="type-caption text-text-muted">{t("hours")}</dt>
          <dd className="type-body-sm text-text-primary">
            {hours.length === 0 ? (
              t("noHours")
            ) : (
              <ul className="flex flex-wrap gap-x-2">
                {hours.map((range) => (
                  <li key={`${range.dayOfWeek}-${range.start}-${range.end}`}>
                    {t("hoursRange", {
                      day: dayLabel(range.dayOfWeek),
                      start: range.start,
                      end: range.end,
                    })}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="type-caption text-text-muted">{t("capacity")}</dt>
          <dd className="type-body-sm text-text-primary">
            {capacity === null
              ? t("noCapacity")
              : t("capacityValue", { capacity })}
          </dd>
        </div>
      </dl>
    </>
  );
}
