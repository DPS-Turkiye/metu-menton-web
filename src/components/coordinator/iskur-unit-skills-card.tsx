"use client";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
import { useTranslations } from "next-intl";
import { useId } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import type { IskurApplicationsState } from "@/hooks/use-iskur-applications";

/** The onboarding forms at a glance and each unit's skills, which the coordinator edits one unit at a time. */
export function IskurUnitSkillsCard({
  applications,
}: {
  applications: IskurApplicationsState;
}) {
  const t = useTranslations("iskurOnboarding.coordinator");
  const editorId = useId();
  const hintId = useId();
  if (applications.loadError) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  if (applications.units.length === 0) return null;
  const editing = applications.editing;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="flex-1 type-title-card text-text-primary">
          {t("skillsTitle")}
        </h2>
        <p className="type-label-sm text-text-muted">
          {t("applications")}:{" "}
          {t("applicationsSummary", {
            submitted: applications.submittedCount,
            drafts: applications.drafts,
          })}
        </p>
      </div>
      <p id={hintId} className="type-body-sm text-text-secondary">
        {t("skillsHint")}
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {applications.units.map((unit) => (
          <li
            key={unit.id}
            className="flex flex-col gap-2 rounded-[12px] border border-border-subtle p-4"
          >
            <p className="type-label text-text-primary">{unit.name}</p>
            {editing?.unitId === unit.id ? (
              <>
                <label htmlFor={editorId} className="sr-only">
                  {t("skillsLabel", { unit: unit.name })}
                </label>
                <textarea
                  id={editorId}
                  value={editing.text}
                  aria-describedby={hintId}
                  onChange={(event) =>
                    applications.setSkillsText(event.target.value)
                  }
                  className={`${ISKUR_FIELD_CLASS} min-h-[140px]`}
                />
                {applications.namesValid ? null : (
                  <p
                    role="alert"
                    className="type-caption text-status-error-text"
                  >
                    {t("skillsInvalid")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size={ButtonSize.Small}
                    disabled={
                      !applications.namesValid || applications.savingSkills
                    }
                    onClick={applications.saveSkills}
                  >
                    {t("saveSkills")}
                  </Button>
                  <Button
                    variant={ButtonVariant.Ghost}
                    size={ButtonSize.Small}
                    onClick={applications.cancelSkills}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="type-body-sm text-text-secondary">
                  {unit.skills.length > 0
                    ? unit.skills.map((skill) => skill.name).join(" · ")
                    : t("noUnitSkills")}
                </p>
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Small}
                  onClick={() => applications.editSkills(unit.id)}
                >
                  {t("editSkills")}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
