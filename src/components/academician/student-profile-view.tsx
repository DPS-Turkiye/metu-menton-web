"use client";

import { CalendarDays, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { AdviseeChip } from "@/components/academician/advisee-chip";
import { WorkspaceQueryState } from "@/components/academician/workspace-query-state";
import { PhotoAvatar } from "@/components/common/avatar";
import { Button, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { StudentInterests } from "@/components/people/student-interests";
import { BackButton } from "@/components/student/ia/back-button";
import {
  useAcademicianStudent,
  type AcademicianStudent,
} from "@/hooks/use-academician-student";
import { useAdviseeInterests } from "@/hooks/use-advisee-interests";
import { initials } from "@/lib/utils";
import {
  StudentHistoryBadge,
  type StudentProfileOrigin,
} from "@/types/academician-office-hours";

const BADGE_TONE: Record<StudentHistoryBadge, StatusTone> = {
  [StudentHistoryBadge.Pending]: StatusTone.Warning,
  [StudentHistoryBadge.Proposed]: StatusTone.Info,
  [StudentHistoryBadge.Confirmed]: StatusTone.Success,
  [StudentHistoryBadge.Completed]: StatusTone.Neutral,
  [StudentHistoryBadge.Cancelled]: StatusTone.Error,
};

/** The full-page student profile (Figma 10.8), reached from Danışan Öğrencilerim or from a request's "Tam Profili Gör". */
export function StudentProfileView({
  userId,
  from,
}: {
  userId: string;
  from: StudentProfileOrigin;
}) {
  const t = useTranslations("iaAcademician.student");
  const profile = useAcademicianStudent(userId, from);
  return (
    <div className="flex flex-col gap-6">
      <BackButton href={profile.back.href}>{profile.back.label}</BackButton>
      {profile.student ? (
        <StudentHeader student={profile.student} />
      ) : (
        <h1 className="sr-only">{t("record")}</h1>
      )}
      <StudentProfileBody profile={profile} withActions />
    </div>
  );
}

function StudentHeader({ student }: { student: AcademicianStudent }) {
  return (
    <header className="flex flex-wrap items-center gap-5">
      <PhotoAvatar
        initials={initials(student.name)}
        personId={student.userId}
        decorative
        colors="bg-background-selected text-text-accent"
        className="size-[72px] type-h3"
      />
      <div className="flex min-w-0 flex-1 basis-56 flex-col items-start gap-1.5">
        <h1 className="type-h2 text-text-primary">{student.name}</h1>
        {student.subtitle === "" ? null : (
          <p className="type-body text-text-muted">{student.subtitle}</p>
        )}
        {student.isAdvisee ? <AdviseeChip /> : null}
      </div>
    </header>
  );
}

/** Loading, error, unknown student or the profile itself; the page and the pop-up show the same body. */
export function StudentProfileBody({
  profile,
  withActions,
}: {
  profile: ReturnType<typeof useAcademicianStudent>;
  withActions: boolean;
}) {
  const t = useTranslations("iaAcademician.student");
  if (profile.student) {
    return (
      <StudentProfileContent
        student={profile.student}
        withActions={withActions}
      />
    );
  }
  if (profile.notFound) {
    return <InlineAlert tone={StatusTone.Neutral}>{t("notFound")}</InlineAlert>;
  }
  return (
    <WorkspaceQueryState
      isLoading={profile.isLoading}
      error={profile.error}
      onRetry={profile.retry}
      isRetrying={profile.isRetrying}
    />
  );
}

function StudentProfileContent({
  student,
  withActions,
}: {
  student: AcademicianStudent;
  /** The pop-up opens over the request drawer, which already answers the request. */
  withActions: boolean;
}) {
  const t = useTranslations("iaAcademician.student");
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="flex min-w-0 flex-col gap-6">
        {student.pendingRequest ? (
          <PendingRequestCard
            request={student.pendingRequest}
            withActions={withActions}
          />
        ) : null}
        <HistoryCard history={student.history} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {/* In the pop-up the header names only the student, so the subtitle joins the record. */}
        <RecordPanel student={student} withSubtitle={!withActions} />
        {/* Only their advisor may read it; for anyone else's student the backend has nothing to show. */}
        {student.isAdvisee ? <InterestsCard userId={student.userId} /> : null}
        <p className="flex items-start gap-2 type-body-sm text-text-muted">
          <Lock
            aria-hidden
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.5}
          />
          {t("privacy")}
        </p>
      </div>
    </div>
  );
}

function RecordPanel({
  student,
  withSubtitle,
}: {
  student: AcademicianStudent;
  withSubtitle: boolean;
}) {
  const t = useTranslations("iaAcademician.student");
  const recordId = useId();
  return (
    <section
      aria-labelledby={recordId}
      className="rounded-2xl bg-background-subtle px-5 py-2"
    >
      <div className="flex items-center justify-between gap-3 py-3">
        <h2 id={recordId} className="type-label-lg text-text-primary">
          {t("record")}
        </h2>
        {withSubtitle && student.isAdvisee ? (
          <AdviseeChip />
        ) : (
          <Lock
            aria-hidden
            className="size-4 text-icon-default"
            strokeWidth={1.5}
          />
        )}
      </div>
      {withSubtitle && student.subtitle !== "" ? (
        <p className="pb-3 type-body-sm text-text-muted">{student.subtitle}</p>
      ) : null}
      <dl className="divide-y divide-border-default border-t border-border-default">
        {student.facts.map((fact) => (
          <div key={fact.key} className="py-2.5">
            <dt className="type-caption text-text-muted">{fact.label}</dt>
            <dd className="type-label break-words text-text-primary">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function InterestsCard({ userId }: { userId: string }) {
  const t = useTranslations("iaAcademician.student.interests");
  const titleId = useId();
  const interests = useAdviseeInterests(userId);
  // The backend found them not to be this academician's advisee after all: no empty card.
  if (!interests.isLoading && !interests.error && interests.profile === null) {
    return null;
  }
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl bg-background-subtle p-5"
    >
      <h2
        id={titleId}
        className="border-b border-border-default pb-3 type-label-lg text-text-primary"
      >
        {t("title")}
      </h2>
      <WorkspaceQueryState
        isLoading={interests.isLoading}
        error={interests.error}
        onRetry={interests.retry}
        isRetrying={interests.isRetrying}
      />
      {interests.profile ? <StudentInterests interests={interests} /> : null}
    </section>
  );
}

function PendingRequestCard({
  request,
  withActions,
}: {
  request: NonNullable<AcademicianStudent["pendingRequest"]>;
  withActions: boolean;
}) {
  const t = useTranslations("iaAcademician.student");
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-2xl border border-status-warning-border bg-background-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="type-label text-text-secondary">
          {t("pendingTitle")}
        </h2>
        <StatusBadge tone={BADGE_TONE[StudentHistoryBadge.Pending]}>
          {t("badges.pending")}
        </StatusBadge>
      </div>
      <p className="type-h4 text-text-primary">{request.topic}</p>
      {request.when === null ? null : (
        <p className="type-body-sm text-text-secondary">{request.when}</p>
      )}
      {request.note === null ? null : (
        <p className="rounded-xl bg-background-subtle px-4 py-3 type-body-sm text-text-secondary">
          {request.note}
        </p>
      )}
      {withActions ? (
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant={ButtonVariant.Ghost} href={request.href}>
            {t("decline")}
          </Button>
          <Button variant={ButtonVariant.Secondary} href={request.proposeHref}>
            {t("propose")}
          </Button>
          <Button href={request.href}>{t("accept")}</Button>
        </div>
      ) : null}
    </section>
  );
}

/** What is still ahead or waiting; the rest is over (Figma 10.8, "Yaklaşan" and "Geçmiş"). */
const AHEAD: ReadonlySet<StudentHistoryBadge> = new Set([
  StudentHistoryBadge.Pending,
  StudentHistoryBadge.Proposed,
  StudentHistoryBadge.Confirmed,
]);

function HistoryCard({ history }: { history: AcademicianStudent["history"] }) {
  const t = useTranslations("iaAcademician.student");
  const titleId = useId();
  const groups = [
    {
      key: "ahead",
      title: t("historyAhead"),
      items: history.filter((item) => AHEAD.has(item.badge)),
    },
    {
      key: "past",
      title: t("historyPast"),
      items: history.filter((item) => !AHEAD.has(item.badge)),
    },
  ].filter((group) => group.items.length > 0);
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-border-default bg-background-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h2 id={titleId} className="type-h4 text-text-primary">
          {t("history")}
        </h2>
        {history.length > 0 ? (
          <p className="type-body-sm text-text-muted">
            {t("historyCount", { count: history.length })}
          </p>
        ) : null}
      </div>
      {history.length === 0 ? (
        <p className="type-body-sm text-text-muted">{t("historyEmpty")}</p>
      ) : (
        groups.map((group) => (
          <div
            key={group.key}
            className="border-t border-border-default py-3 last:pb-0"
          >
            <h3 className="type-overline text-text-secondary">{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5"
                >
                  <CalendarDays
                    aria-hidden
                    className="size-4 shrink-0 text-icon-default"
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="type-label break-words text-text-primary">
                      {item.title}
                    </p>
                    <p className="type-body-sm text-text-muted">{item.when}</p>
                  </div>
                  <StatusBadge tone={BADGE_TONE[item.badge]}>
                    {t(`badges.${item.badge}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
