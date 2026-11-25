import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { sharedInterests } from "@/lib/student-interests";

/** A student's interests and goal, as their advisor and the peer mentors they asked read them. */
export function StudentInterests({
  interests,
}: {
  interests: ReturnType<typeof sharedInterests>;
}) {
  const t = useTranslations("iaAcademician.student.interests");
  const tSub = useTranslations("studentProfileCompletion.subtopics");
  const topicLabel = useTranslations("peerTopics");
  if (interests.isEmpty) {
    return <p className="type-body-sm text-text-muted">{t("empty")}</p>;
  }
  return (
    <dl className="space-y-4">
      {interests.topics.length === 0 ? null : (
        <div className="space-y-2">
          <dt className="type-caption text-text-muted">{t("topics")}</dt>
          <dd>
            <ul className="flex flex-wrap gap-2">
              {interests.topics.map((topic) => (
                <Chip key={topic}>{topicLabel(topic)}</Chip>
              ))}
              {interests.subtopics.map((sub) => (
                <Chip key={sub.id}>{tSub(sub.labelKey)}</Chip>
              ))}
            </ul>
          </dd>
        </div>
      )}
      <div className="space-y-1">
        <dt className="type-caption text-text-muted">{t("goal")}</dt>
        <dd className="type-body-sm whitespace-pre-line text-text-primary">
          {interests.goal || t("noGoal")}
        </dd>
      </div>
    </dl>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-full bg-background-selected px-3 py-1.5 type-label-sm text-text-accent">
      {children}
    </li>
  );
}
