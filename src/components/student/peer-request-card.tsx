"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  InitialsAvatar,
  RequestStatusBadge,
  Tag,
} from "@/components/student/iskur-ui";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import type { PeerMentoringRequest } from "@/interfaces/peer-mentoring";
import { formatDateTime, initials } from "@/lib/utils";

/** A received request, or the mentorship it became: who asked, about what, and the actions under it. */
export function PeerRequestCard({
  request,
  children,
}: {
  request: PeerMentoringRequest;
  children?: ReactNode;
}) {
  const t = useTranslations("iaIskur.give.requests");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  const date = formatDateTime(request.createdAt, locale);
  return (
    <article
      aria-label={request.mentee.fullName}
      className="flex flex-col gap-3 rounded-2xl border border-border-default bg-background-surface p-5"
    >
      <div className="flex flex-wrap items-center gap-4 sm:px-5 sm:py-4">
        <InitialsAvatar initials={initials(request.mentee.fullName)} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate type-label-lg text-text-primary">
            {request.mentee.fullName}
          </p>
          <p className="type-body-sm text-text-muted">
            {request.mentee.department
              ? t("sentAtFrom", {
                  department: request.mentee.department,
                  date,
                })
              : t("sentAt", { date })}
          </p>
        </div>
        {request.status === MentorshipRequestStatus.Pending ? null : (
          <RequestStatusBadge status={request.status} />
        )}
        <Tag>{tTopic(request.category)}</Tag>
      </div>
      <p className="type-body break-words text-text-secondary">
        {t("quote", { message: request.message })}
      </p>
      {children}
    </article>
  );
}
