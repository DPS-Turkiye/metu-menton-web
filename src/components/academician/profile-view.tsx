"use client";

// TEST UI: there is no academician Profilim frame yet. This follows the student's Profilim (Figma 4.5) — cards on
// the left, ODTÜ's record on the right — until the design owner approves a screen; replace it when that arrives.
import { Lock, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { WorkspaceQueryState } from "@/components/academician/workspace-query-state";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { Toggle } from "@/components/ia/toggle";
import { useAcademicianProfile } from "@/hooks/use-academician-profile";
import { OFFICE_HOURS_PROFILE_LIMITS as LIMITS } from "@/interfaces/office-hours-me";
import { RESPONSE_DAY_OPTIONS } from "@/lib/academician-profile";
import type { ProfileFormError } from "@/types/academician-profile";

type Profile = ReturnType<typeof useAcademicianProfile>;
type Form = NonNullable<Profile["form"]>;

const FIELD =
  "h-11 w-full rounded-input border border-border-control bg-background-surface px-3 type-body-sm text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-border-selected aria-invalid:border-status-error-icon";

const AREA =
  "min-h-[120px] w-full rounded-input border border-border-control bg-background-surface px-3 py-2.5 type-body-sm text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-border-selected aria-invalid:border-status-error-icon";

/** Profilim (layout of Figma 4.5): what students see about the academician, beside ODTÜ's record. */
export function AcademicianProfileView() {
  const t = useTranslations("iaAcademician.profile");
  const profile = useAcademicianProfile();
  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileForm profile={profile} />
        </div>
        <aside className="flex flex-col gap-6">
          <InstitutionPanel institution={profile.institution} />
        </aside>
      </div>
    </>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("iaAcademician.profile");
  const { form } = profile;
  if (!form) {
    return (
      <WorkspaceQueryState
        isLoading={profile.settingsLoading}
        error={profile.settingsError}
        onRetry={profile.retrySettings}
      />
    );
  }
  return (
    <form noValidate onSubmit={profile.submit} className="flex flex-col gap-6">
      <fieldset
        disabled={profile.isSaving}
        className="flex min-w-0 flex-col gap-6"
      >
        <legend className="sr-only">{t("title")}</legend>
        <VisibilityCard form={form} profile={profile} />
        <MeetingCard form={form} profile={profile} />
        <AboutCard form={form} profile={profile} />
        <TopicsCard form={form} profile={profile} />
        <CoursesCard form={form} profile={profile} />
        <EmailsCard form={form} profile={profile} />
      </fieldset>
      <SaveBar profile={profile} />
    </form>
  );
}

function CardTitle({
  id,
  title,
  hint,
}: {
  id: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-5">
      <h2 id={id} className="type-h4 text-text-primary">
        {title}
      </h2>
      {hint ? (
        <p className="mt-1 type-body-sm text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function FieldError({
  id,
  error,
}: {
  id: string;
  error: ProfileFormError | undefined;
}) {
  const t = useTranslations("iaAcademician.profile.errors");
  if (!error) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 type-caption text-status-error-text"
    >
      {t(error)}
    </p>
  );
}

function Labelled({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="type-label-sm text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

function VisibilityCard({ form, profile }: { form: Form; profile: Profile }) {
  const t = useTranslations("iaAcademician.profile.visibility");
  return (
    <Card labelledBy="profile-visibility">
      <CardTitle id="profile-visibility" title={t("title")} />
      <Toggle
        label={t("toggle")}
        checked={form.listed}
        onChange={profile.setListed}
      />
      <p className="mt-3 type-body-sm text-text-muted">
        {form.listed ? t("on") : t("off")}
      </p>
    </Card>
  );
}

function MeetingCard({ form, profile }: { form: Form; profile: Profile }) {
  const t = useTranslations("iaAcademician.profile.meeting");
  const { errors } = profile;
  return (
    <Card labelledBy="profile-meeting">
      <CardTitle id="profile-meeting" title={t("title")} hint={t("hint")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Labelled id="profile-defaultPlace" label={t("defaultPlace")}>
          <input
            id="profile-defaultPlace"
            value={form.defaultPlace}
            maxLength={200}
            placeholder={t("defaultPlacePlaceholder")}
            onChange={(event) =>
              profile.setField("defaultPlace", event.target.value)
            }
            className={FIELD}
          />
        </Labelled>
        <Labelled id="profile-onlineLink" label={t("onlineLink")}>
          <input
            id="profile-onlineLink"
            type="url"
            value={form.onlineLink}
            maxLength={500}
            placeholder={t("onlineLinkPlaceholder")}
            aria-invalid={errors.onlineLink ? true : undefined}
            aria-describedby={
              errors.onlineLink ? "profile-onlineLink-error" : undefined
            }
            onChange={(event) =>
              profile.setField("onlineLink", event.target.value)
            }
            className={FIELD}
          />
          <FieldError id="profile-onlineLink-error" error={errors.onlineLink} />
        </Labelled>
        <div className="md:col-span-2">
          <Labelled id="profile-contactEmail" label={t("contactEmail")}>
            <input
              id="profile-contactEmail"
              type="email"
              value={form.contactEmail}
              maxLength={320}
              aria-invalid={errors.contactEmail ? true : undefined}
              aria-describedby={
                errors.contactEmail ? "profile-contactEmail-error" : undefined
              }
              onChange={(event) =>
                profile.setField("contactEmail", event.target.value)
              }
              className={FIELD}
            />
            <FieldError
              id="profile-contactEmail-error"
              error={errors.contactEmail}
            />
          </Labelled>
        </div>
      </div>
    </Card>
  );
}

function AboutCard({ form, profile }: { form: Form; profile: Profile }) {
  const t = useTranslations("iaAcademician.profile.about");
  const { errors, tags } = profile;
  return (
    <Card labelledBy="profile-about">
      <CardTitle id="profile-about" title={t("title")} hint={t("hint")} />
      <div className="flex flex-col gap-5">
        <Labelled id="profile-about-text" label={t("label")}>
          <textarea
            id="profile-about-text"
            value={form.about}
            maxLength={LIMITS.about}
            placeholder={t("placeholder")}
            aria-invalid={errors.about ? true : undefined}
            aria-describedby="profile-about-count profile-about-error"
            onChange={(event) => profile.setField("about", event.target.value)}
            className={AREA}
          />
          <p id="profile-about-count" className="type-caption text-text-muted">
            {t("count", { count: form.about.length, max: LIMITS.about })}
          </p>
          <FieldError id="profile-about-error" error={errors.about} />
        </Labelled>
        <div className="max-w-xs">
          <Labelled id="profile-responseDays" label={t("responseDays")}>
            <select
              id="profile-responseDays"
              value={form.responseDays}
              onChange={(event) =>
                profile.setField("responseDays", event.target.value)
              }
              className={FIELD}
            >
              <option value="">{t("responseDaysNone")}</option>
              {RESPONSE_DAY_OPTIONS.map((days) => (
                <option key={days} value={String(days)}>
                  {t("responseDaysOption", { count: days })}
                </option>
              ))}
            </select>
          </Labelled>
        </div>
        <div className="flex flex-col gap-3">
          <Labelled id="profile-tag-input" label={t("tags")}>
            <div className="flex gap-2">
              <input
                id="profile-tag-input"
                value={tags.draft}
                maxLength={LIMITS.tag}
                placeholder={t("tagPlaceholder")}
                aria-describedby="profile-tag-hint profile-tag-error"
                aria-invalid={tags.problem ? true : undefined}
                onChange={(event) => tags.setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter adds the tag instead of submitting the whole form.
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  tags.add();
                }}
                className={FIELD}
              />
              <Button
                variant={ButtonVariant.Secondary}
                onClick={tags.add}
                className="h-11"
              >
                <Plus aria-hidden className="size-4" strokeWidth={1.5} />
                {t("tagAdd")}
              </Button>
            </div>
          </Labelled>
          <p id="profile-tag-hint" className="type-caption text-text-muted">
            {t("tagHint", { max: LIMITS.tags })}
          </p>
          {tags.problem ? (
            <p
              id="profile-tag-error"
              role="alert"
              className="type-caption text-status-error-text"
            >
              {t(`tagErrors.${tags.problem}`, { max: LIMITS.tags })}
            </p>
          ) : null}
          {form.expertise.length > 0 && (
            <ul aria-label={t("tagList")} className="flex flex-wrap gap-2">
              {form.expertise.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-background-subtle pr-1 pl-3 type-label-sm text-text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={t("tagRemove", { tag })}
                    onClick={() => tags.remove(tag)}
                    className="grid size-6 place-items-center rounded-full hover:bg-background-selected focus-visible:outline-2 focus-visible:outline-border-selected"
                  >
                    <X aria-hidden className="size-3.5" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function RowShell({
  label,
  removeLabel,
  onRemove,
  error,
  errorId,
  children,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
  error: ProfileFormError | undefined;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <li
      aria-label={label}
      className="rounded-2xl border border-border-default p-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-3">{children}</div>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Small}
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
      <FieldError id={errorId} error={error} />
    </li>
  );
}

function TopicsCard({ form, profile }: { form: Form; profile: Profile }) {
  const t = useTranslations("iaAcademician.profile.topics");
  const { topics, errors } = profile;
  return (
    <Card labelledBy="profile-topics">
      <CardTitle
        id="profile-topics"
        title={t("title")}
        hint={t("hint", { max: LIMITS.topics })}
      />
      {form.topics.length === 0 && (
        <p className="type-body-sm text-text-secondary">{t("empty")}</p>
      )}
      <ul className="flex flex-col gap-3">
        {form.topics.map((row, index) => {
          const errorId = `profile-topic-${row.key}-error`;
          return (
            <RowShell
              key={row.key}
              label={t("row", { number: index + 1 })}
              removeLabel={t("remove", { number: index + 1 })}
              onRemove={() => topics.remove(row.key)}
              error={errors.topics[row.key]}
              errorId={errorId}
            >
              <Labelled
                id={`profile-topic-${row.key}-title`}
                label={t("topicTitle")}
              >
                <input
                  id={`profile-topic-${row.key}-title`}
                  value={row.title}
                  maxLength={LIMITS.topicTitle}
                  aria-describedby={errorId}
                  onChange={(event) =>
                    topics.change(row.key, { title: event.target.value })
                  }
                  className={FIELD}
                />
              </Labelled>
              <Labelled
                id={`profile-topic-${row.key}-body`}
                label={t("topicBody")}
              >
                <input
                  id={`profile-topic-${row.key}-body`}
                  value={row.body}
                  maxLength={LIMITS.topicBody}
                  aria-describedby={errorId}
                  onChange={(event) =>
                    topics.change(row.key, { body: event.target.value })
                  }
                  className={FIELD}
                />
              </Labelled>
            </RowShell>
          );
        })}
      </ul>
      {topics.canAdd ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Small}
          onClick={topics.add}
          className="mt-4"
        >
          <Plus aria-hidden className="size-4" strokeWidth={1.5} />
          {t("add")}
        </Button>
      ) : null}
    </Card>
  );
}

function CoursesCard({ form, profile }: { form: Form; profile: Profile }) {
  const t = useTranslations("iaAcademician.profile.courses");
  const { courses, errors } = profile;
  return (
    <Card labelledBy="profile-courses">
      <CardTitle
        id="profile-courses"
        title={t("title")}
        hint={t("hint", { max: LIMITS.courses })}
      />
      {form.courses.length === 0 && (
        <p className="type-body-sm text-text-secondary">{t("empty")}</p>
      )}
      <ul className="flex flex-col gap-3">
        {form.courses.map((row, index) => {
          const errorId = `profile-course-${row.key}-error`;
          return (
            <RowShell
              key={row.key}
              label={t("row", { number: index + 1 })}
              removeLabel={t("remove", { number: index + 1 })}
              onRemove={() => courses.remove(row.key)}
              error={errors.courses[row.key]}
              errorId={errorId}
            >
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <Labelled
                  id={`profile-course-${row.key}-code`}
                  label={t("code")}
                >
                  <input
                    id={`profile-course-${row.key}-code`}
                    value={row.code}
                    maxLength={LIMITS.courseCode}
                    placeholder={t("codePlaceholder")}
                    aria-describedby={errorId}
                    onChange={(event) =>
                      courses.change(row.key, { code: event.target.value })
                    }
                    className={FIELD}
                  />
                </Labelled>
                <Labelled
                  id={`profile-course-${row.key}-name`}
                  label={t("name")}
                >
                  <input
                    id={`profile-course-${row.key}-name`}
                    value={row.name}
                    maxLength={LIMITS.courseName}
                    aria-describedby={errorId}
                    onChange={(event) =>
                      courses.change(row.key, { name: event.target.value })
                    }
                    className={FIELD}
                  />
                </Labelled>
              </div>
            </RowShell>
          );
        })}
      </ul>
      {courses.canAdd ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Small}
          onClick={courses.add}
          className="mt-4"
        >
          <Plus aria-hidden className="size-4" strokeWidth={1.5} />
          {t("add")}
        </Button>
      ) : null}
    </Card>
  );
}

function EmailsCard({ form, profile }: { form: Form; profile: Profile }) {
  const t = useTranslations("iaAcademician.profile.emails");
  return (
    <Card labelledBy="profile-emails">
      <CardTitle id="profile-emails" title={t("title")} hint={t("hint")} />
      <div className="flex flex-col gap-4">
        <Toggle
          label={t("newRequest")}
          checked={form.emails.newRequest}
          onChange={(on) => profile.setEmail("newRequest", on)}
        />
        <Toggle
          label={t("cancellation")}
          checked={form.emails.cancellation}
          onChange={(on) => profile.setEmail("cancellation", on)}
        />
      </div>
    </Card>
  );
}

function SaveBar({ profile }: { profile: Profile }) {
  const t = useTranslations("iaAcademician.profile");
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {profile.isDirty ? (
        <p role="status" className="mr-auto type-body-sm text-text-muted">
          {t("unsaved")}
        </p>
      ) : null}
      <Button
        variant={ButtonVariant.Ghost}
        disabled={!profile.isDirty || profile.isSaving}
        onClick={profile.discard}
      >
        {t("discard")}
      </Button>
      <Button type="submit" disabled={!profile.isDirty || profile.isSaving}>
        {profile.isSaving ? t("saving") : t("save")}
      </Button>
    </div>
  );
}

/** "Kurumsal Bilgiler" (as in Figma 4.5): ODTÜ's record, read-only; title and department are never edited here. */
function InstitutionPanel({
  institution,
}: {
  institution: Profile["institution"];
}) {
  const t = useTranslations("iaAcademician.profile.institution");
  return (
    <>
      <section
        aria-labelledby="profile-institution"
        className="rounded-2xl bg-background-subtle px-5 py-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
          <h2
            id="profile-institution"
            className="type-label-lg text-text-primary"
          >
            {t("title")}
          </h2>
          <p className="flex items-center gap-2 type-caption text-text-muted">
            <Lock aria-hidden className="size-4" strokeWidth={1.5} />
            {t("source")}
          </p>
        </div>
        <InstitutionBody institution={institution} />
      </section>
      <p className="type-body-sm text-text-muted">{t("note")}</p>
    </>
  );
}

function InstitutionBody({
  institution,
}: {
  institution: Profile["institution"];
}) {
  const t = useTranslations("iaAcademician.profile.institution");
  if (institution.isLoading) {
    return (
      <p role="status" className="pb-4 type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (institution.missing) {
    return (
      <div className="pb-4">
        <p className="type-label text-text-primary">{t("missingTitle")}</p>
        <p className="type-body-sm text-text-secondary">{t("missingBody")}</p>
      </div>
    );
  }
  if (institution.error) {
    return (
      <div className="pb-4">
        <InlineAlert tone={StatusTone.Error} title={t("loadError")}>
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            disabled={institution.isFetching}
            onClick={institution.retry}
            className="mt-2"
          >
            {t("retry")}
          </Button>
        </InlineAlert>
      </div>
    );
  }
  const { record } = institution;
  if (!record) return null;
  return (
    <dl className="divide-y divide-border-default border-t border-border-default">
      <Row label={t("fullName")} value={record.fullName} />
      <Row label={t("academicTitle")} value={record.academicTitle} />
      <Row label={t("department")} value={record.departmentName} />
      <Row label={t("faculty")} value={record.faculty} />
      <Row label={t("email")} value={record.email} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  const t = useTranslations("iaAcademician.profile.institution");
  return (
    <div className="py-2.5">
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className="type-label break-words text-text-primary">
        {value ?? t("unknown")}
      </dd>
    </div>
  );
}
