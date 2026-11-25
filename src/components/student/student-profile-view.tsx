"use client";

import { Lock, Pencil, Upload, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { MyBadgesSection } from "@/components/badges/my-badges-section";
import { PhotoAvatar } from "@/components/common/avatar";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { IskurFormCard } from "@/components/iskur/iskur-form-card";
import { ProductTourReplayButton } from "@/components/product-tour/product-tour-replay-button";
import { Chip } from "@/components/student/ia/ui";
import {
  GoalField,
  SubtopicPicker,
  TopicPicker,
} from "@/components/student/interest-pickers";
import { useProfilePhoto } from "@/hooks/use-profile-photo";
import {
  useStudentInstitution,
  useStudentInterests,
} from "@/hooks/use-student-profile";
import { Workspace } from "@/interfaces/workspace";
import { PROFILE_PHOTO_TYPES } from "@/lib/personal-profile";
import { titledName } from "@/lib/profile-completion";
import { initials } from "@/lib/utils";

const CARD =
  "rounded-2xl border border-border-default bg-background-surface p-6";

/** Profilim (Figma 4.5). */
export function StudentProfileView() {
  const t = useTranslations("iaStudent.profile");
  const institution = useStudentInstitution();
  return (
    <>
      {/* Figma 4.5 opens on the cards; the title stays for screen readers. */}
      <h1 className="sr-only">{t("title")}</h1>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <InterestsCard />
          <PhotoCard name={institution.record?.fullName ?? null} />
          <IskurFormCard />
          <MyBadgesSection />
        </div>
        <aside className="flex flex-col gap-6">
          <InstitutionPanel institution={institution} />
          <div>
            <ProductTourReplayButton workspace={Workspace.OdtuStudent} />
          </div>
        </aside>
      </div>
    </>
  );
}

function InterestsCard() {
  const t = useTranslations("iaStudent.profile.interests");
  const tSub = useTranslations("studentProfileCompletion.subtopics");
  const topicLabel = useTranslations("peerTopics");
  const interests = useStudentInterests();
  const { saved, draft } = interests;

  return (
    <section aria-labelledby="profile-interests" className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="profile-interests" className="type-h4 text-text-primary">
          {t("title")}
        </h2>
        {saved && !draft ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            onClick={interests.startEditing}
          >
            <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
            {t("edit")}
          </Button>
        ) : null}
      </div>
      {interests.isLoading ? (
        <p role="status" className="mt-4 type-body-sm text-text-muted">
          {t("loading")}
        </p>
      ) : interests.loadError ? (
        <InlineAlert
          tone={StatusTone.Error}
          title={t("loadError")}
          className="mt-4"
        >
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            disabled={interests.isFetching}
            onClick={interests.retry}
            className="mt-2"
          >
            {t("retry")}
          </Button>
        </InlineAlert>
      ) : draft ? (
        <form
          className="mt-5 flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            interests.save();
          }}
        >
          <fieldset
            disabled={interests.isSaving}
            className="flex min-w-0 flex-col gap-5"
          >
            <legend className="sr-only">{t("title")}</legend>
            <TopicPicker
              categories={interests.categories}
              selected={draft.topics}
              onToggle={interests.toggleTopic}
            />
            <SubtopicPicker
              groups={interests.chosen}
              selected={draft.subtopics}
              onToggle={interests.toggleSubtopic}
            />
            <GoalField value={draft.goal} onChange={interests.setGoal} />
            {interests.saveError ? (
              <InlineAlert tone={StatusTone.Error}>
                {t("saveError")}
              </InlineAlert>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant={ButtonVariant.Ghost} onClick={interests.cancel}>
                {t("cancel")}
              </Button>
              <Button type="submit">
                {interests.isSaving ? t("saving") : t("save")}
              </Button>
            </div>
          </fieldset>
        </form>
      ) : saved ? (
        saved.topics.length === 0 && !saved.goal ? (
          <p className="mt-4 type-body-sm text-text-secondary">{t("empty")}</p>
        ) : (
          <dl className="mt-5 flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <dt className="type-label-sm text-text-secondary">
                {t("topics")}
              </dt>
              <dd>
                <ul className="flex flex-wrap gap-2">
                  {interests.chosen.map((item) => (
                    <li key={item.id}>
                      <Chip>{topicLabel(item.id)}</Chip>
                    </li>
                  ))}
                  {interests.savedSubtopics.map((sub) => (
                    <li key={sub.id}>
                      <Chip>{tSub(sub.labelKey)}</Chip>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="flex flex-col gap-2">
              <dt className="type-label-sm text-text-secondary">{t("goal")}</dt>
              <dd className="type-body whitespace-pre-line text-text-primary">
                {saved.goal || t("noGoal")}
              </dd>
            </div>
          </dl>
        )
      ) : null}
      <p className="mt-5 flex items-center gap-2 type-body-sm text-text-muted">
        <User aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        {t("visibility")}
      </p>
    </section>
  );
}

/** "Kurumsal bilgiler" (Figma 4.5): the ODTÜ record, read-only, with the advisor. */
function InstitutionPanel({
  institution,
}: {
  institution: ReturnType<typeof useStudentInstitution>;
}) {
  const t = useTranslations("iaStudent.profile.institution");
  const { record } = institution;
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
        {institution.isLoading ? (
          <p role="status" className="pb-4 type-body-sm text-text-muted">
            {t("loading")}
          </p>
        ) : institution.missing ? (
          <div className="pb-4">
            <p className="type-label text-text-primary">{t("missingTitle")}</p>
            <p className="type-body-sm text-text-secondary">
              {t("missingBody")}
            </p>
          </div>
        ) : institution.error ? (
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
        ) : record ? (
          <dl className="divide-y divide-border-default border-t border-border-default">
            <Row label={t("fullName")} value={record.fullName} />
            <Row label={t("email")} value={record.email} />
            <Row label={t("department")} value={record.departmentName} />
            <Row label={t("classYear")} value={institution.classLine} />
            {record.advisor ? (
              <Row
                label={t("advisor")}
                value={titledName(
                  record.advisor.academicTitle,
                  record.advisor.fullName,
                )}
              />
            ) : null}
          </dl>
        ) : null}
      </section>
      <p className="type-body-sm text-text-muted">{t("note")}</p>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  const t = useTranslations("iaStudent.profile.institution");
  return (
    <div className="py-2.5">
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className="type-label break-words text-text-primary">
        {value ?? t("unknown")}
      </dd>
    </div>
  );
}

function PhotoCard({ name }: { name: string | null }) {
  const t = useTranslations("iaStudent.profile.photo");
  const photo = useProfilePhoto();
  return (
    <section
      aria-labelledby="profile-photo"
      className={`flex flex-wrap items-center gap-4 ${CARD}`}
    >
      <PhotoAvatar
        initials={name ? initials(name) : ""}
        photoUrl={photo.photoUrl}
        className="size-14 bg-background-selected type-h4 text-text-accent"
        decorative
      />
      <div className="min-w-0 flex-1 basis-56">
        <h2 id="profile-photo" className="type-label text-text-primary">
          {t("title")}
        </h2>
        <p className="type-body-sm text-text-muted">{t("formats")}</p>
      </div>
      <label
        className={`inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-button-sm bg-action-secondary-bg px-3 type-button-sm text-action-secondary-fg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-border-selected ${
          photo.isUploading ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <Upload aria-hidden className="size-4" strokeWidth={1.5} />
        {photo.isUploading ? t("uploading") : t("upload")}
        <input
          type="file"
          accept={PROFILE_PHOTO_TYPES.join(",")}
          className="sr-only"
          disabled={photo.isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) photo.upload(file);
            event.target.value = "";
          }}
        />
      </label>
    </section>
  );
}
