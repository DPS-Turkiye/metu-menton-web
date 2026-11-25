"use client";

import {
  CalendarDays,
  Check,
  CircleX,
  Pencil,
  Repeat,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useId, type ReactNode } from "react";

import { AppointmentStatusBadge } from "@/components/academician/appointment-status-badge";
import { StudentAvatar } from "@/components/academician/student-avatar";
import { WorkspaceQueryState } from "@/components/academician/workspace-query-state";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { SectionHeader } from "@/components/student/ia/ui";
import {
  useAcademicianHome,
  type AcademicianHome,
  type HomeRequestCard,
} from "@/hooks/use-academician-home";
import { AppointmentStatus } from "@/interfaces/appointment";
import { AvailabilityItemKind } from "@/types/academician-office-hours";

/** Ana Sayfa (Figma 10.3), or what to do first while there are no open hours. */
export function AcademicianHomeView() {
  const { home, isLoading, error, retry, isRetrying } = useAcademicianHome();
  if (!home) {
    return (
      <WorkspaceQueryState
        isLoading={isLoading}
        error={error}
        onRetry={retry}
        isRetrying={isRetrying}
      />
    );
  }
  // Without open hours the design drops the greeting and its actions: "Müsaitlik Ekle" is the one thing to do.
  if (!home.hasAvailability) {
    return (
      <div className="space-y-8">
        <HomeWithoutAvailability home={home} />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <HomeHeader home={home} />
      <HomeWithAvailability home={home} />
    </div>
  );
}

function HomeHeader({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home");
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="type-body text-text-muted">{home.date}</p>
        <h1 className="type-h1 text-text-primary">{home.greeting}</h1>
      </div>
      <Button variant={ButtonVariant.Secondary} href={home.links.availability}>
        <Pencil aria-hidden className="size-5" strokeWidth={1.5} />
        {t("editAvailability")}
      </Button>
    </header>
  );
}

function HomeWithAvailability({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home");
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <PendingRequests home={home} />
      <div className="flex flex-col gap-6">
        <Today home={home} />
        <Availability home={home} />
        {home.stats.advisees === null ? null : (
          <p className="flex items-center gap-2 type-body-sm text-text-muted">
            <User aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            {t("advisees", { count: home.stats.advisees })}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-2xl bg-background-subtle p-5">
      <p className="type-caption text-text-secondary">{label}</p>
      <p className="mt-2 type-h2 text-text-primary">{value}</p>
      <p className="mt-1 type-caption text-text-muted">{hint}</p>
    </div>
  );
}

const LIST =
  "divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface";

function PendingRequests({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home.requests");
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-5">
      <SectionHeader
        id={titleId}
        title={t("title")}
        hint={
          home.pendingCount > 0
            ? `${String(home.pendingCount)} · ${home.stats.pending.hint}`
            : undefined
        }
        action={
          home.pendingCount > 0
            ? { href: home.links.appointments, label: t("seeAll") }
            : undefined
        }
      />
      {home.requests.length > 0 ? (
        <div className={LIST}>
          <ul className="divide-y divide-border-default">
            {home.requests.map((card) => (
              <li key={card.id}>
                <PendingRequestRow card={card} home={home} />
              </li>
            ))}
          </ul>
          {home.more === null ? null : (
            <p className="px-6 py-5">
              <Link
                href={home.links.appointments}
                className="type-button-sm text-text-link hover:underline"
              >
                {home.more}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-2xl bg-background-subtle px-5 py-4 type-body-sm text-text-secondary">
          {t("empty")}
        </p>
      )}
    </section>
  );
}

function PendingRequestRow({
  card,
  home,
}: {
  card: HomeRequestCard;
  home: AcademicianHome;
}) {
  const t = useTranslations("iaAcademician.home.requests");
  const nameId = useId();
  const busy = home.answeringId === card.id;
  const acceptLabel = (
    <>
      <Check aria-hidden className="size-4" strokeWidth={1.5} />
      {t("accept")}
    </>
  );
  return (
    <section aria-labelledby={nameId} className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:px-5 sm:pt-4">
        <StudentAvatar name={card.studentName} />
        <div className="min-w-0 flex-1 basis-56">
          <p className="type-label break-words text-text-primary">
            <span id={nameId}>{card.studentName}</span>
            {` · ${card.topic}`}
          </p>
          {card.detail === "" ? null : (
            <p className="type-body-sm text-text-muted">{card.detail}</p>
          )}
        </div>
        <p className="type-label-sm text-text-secondary">{card.when}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {card.canDecline ? (
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            href={card.href}
          >
            {t("decline")}
          </Button>
        ) : null}
        {card.canPropose ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            href={card.proposeHref}
          >
            {t("propose")}
          </Button>
        ) : null}
        {card.acceptTime === null ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            href={card.href}
          >
            {acceptLabel}
          </Button>
        ) : (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            disabled={busy}
            onClick={() => {
              home.accept(card);
            }}
          >
            {acceptLabel}
          </Button>
        )}
      </div>
    </section>
  );
}

function Today({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home.today");
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <SectionHeader
        id={titleId}
        title={t("title")}
        hint={t("count", { count: home.today.length })}
      />
      {home.today.length > 0 ? (
        <ul className={LIST}>
          {home.today.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-4 px-5 py-3 hover:bg-background-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-selected"
              >
                <span className="w-12 shrink-0 type-label-lg text-text-primary">
                  {item.time}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block type-label break-words text-text-primary">
                    {item.studentName}
                  </span>
                  <span className="block type-body-sm break-words text-text-muted">
                    {item.topic}
                  </span>
                </span>
                <AppointmentStatusBadge status={AppointmentStatus.Confirmed} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-background-subtle px-5 py-4 type-body-sm text-text-secondary">
          {t("empty")}
        </p>
      )}
    </section>
  );
}

function Availability({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home.availability");
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <SectionHeader id={titleId} title={t("title")} />
      <dl className="flex flex-col gap-2 rounded-2xl border border-border-default bg-background-surface p-5">
        {home.availability.map((row) => (
          <div key={row.key} className="flex items-baseline gap-4">
            <dt className="w-26 shrink-0 type-body-sm text-text-muted">
              {row.label}
            </dt>
            <dd className="min-w-0 type-label text-text-primary">
              {row.hours}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HomeWithoutAvailability({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home");
  const { stats } = home;
  return (
    <>
      <EmptyAvailability home={home} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("stats.pending")}
          value={stats.pending.value}
          hint={
            home.pendingCount > 0 ? stats.pending.hint : t("stats.pendingEmpty")
          }
        />
        <StatCard
          label={t("stats.upcoming")}
          value={stats.upcoming}
          hint={t("stats.none")}
        />
        <StatCard
          label={t("stats.advisees")}
          value={stats.advisees ?? t("stats.none")}
          hint={t("stats.adviseesHint")}
        />
      </div>
      {/* Requests sent before the hours were cleared still need an answer. */}
      {home.pendingCount > 0 ? <PendingRequests home={home} /> : null}
    </>
  );
}

const EXAMPLES: {
  kind: AvailabilityItemKind;
  icon: ReactNode;
  title: "recurringTitle" | "oneOffTitle" | "unavailableTitle";
  hint: "recurringHint" | "oneOffHint" | "unavailableHint";
}[] = [
  {
    kind: AvailabilityItemKind.Recurring,
    icon: <Repeat aria-hidden className="size-4 text-brand-odtu-strong" />,
    title: "recurringTitle",
    hint: "recurringHint",
  },
  {
    kind: AvailabilityItemKind.OneOff,
    icon: (
      <CalendarDays aria-hidden className="size-4 text-brand-odtu-strong" />
    ),
    title: "oneOffTitle",
    hint: "oneOffHint",
  },
  {
    kind: AvailabilityItemKind.Unavailable,
    icon: <CircleX aria-hidden className="size-4 text-brand-odtu-strong" />,
    title: "unavailableTitle",
    hint: "unavailableHint",
  },
];

function EmptyAvailability({ home }: { home: AcademicianHome }) {
  const t = useTranslations("iaAcademician.home.empty");
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="grid grid-cols-1 items-center gap-8 rounded-featured px-2 py-6 lg:grid-cols-[minmax(0,1fr)_440px]"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Image
            alt=""
            src="/ia/academician/availability-calendar.png"
            width={70}
            height={70}
            className="shrink-0"
          />
          <h1 id={titleId} className="type-h3 text-text-primary">
            {t("title")}
          </h1>
        </div>
        <p className="max-w-xl type-body text-text-secondary">{t("body")}</p>
        <div data-tour="availability-add" className="w-fit">
          <Button href={home.links.availability}>{t("cta")}</Button>
        </div>
      </div>
      <ul aria-label={t("examplesLabel")} className="space-y-3">
        {EXAMPLES.map((example) => (
          <li
            key={example.kind}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              example.kind === AvailabilityItemKind.Unavailable
                ? "border-status-error-border bg-brand-odtu-bg"
                : "border-border-default bg-background-surface"
            }`}
          >
            {example.icon}
            <span>
              <span className="block type-label text-text-primary">
                {t(example.title)}
              </span>
              <span className="block type-caption text-text-muted">
                {t(example.hint)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
