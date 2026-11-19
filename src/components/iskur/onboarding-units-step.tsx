"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { Card } from "@/components/ia/card";
import type { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import { IskurSkillLevel } from "@/interfaces/iskur-onboarding";
import {
  ISKUR_TEAM_ROLE_OPTIONS,
  ISKUR_TEAM_ROLES_MAX,
} from "@/lib/iskur-onboarding";

type Wizard = ReturnType<typeof useIskurOnboarding>;

const LEVELS = [
  IskurSkillLevel.None,
  IskurSkillLevel.Beginner,
  IskurSkillLevel.Good,
  IskurSkillLevel.Expert,
] as const;

/** 03 · Tercihler ve yetkinlikler (Figma 287:274): the ODTÜ record, units, each chosen unit's skills, team roles. */
export function OnboardingUnitsStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.units");
  const form = wizard.form;
  const context = wizard.context;
  if (!form || !context) return null;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("intro")}</p>
      </header>

      <Card className="grid gap-4 sm:grid-cols-2">
        <RecordField
          label={t("department")}
          value={context.department ?? t("unknown")}
          note={t("fromRecords")}
        />
        <RecordField
          label={t("classYear")}
          value={
            context.classYear === null
              ? t("unknown")
              : t("classValue", { year: context.classYear })
          }
          note={t("fromRecords")}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 type-title-card text-text-primary">
            {t("unitsTitle")}
          </h2>
          <p className="type-label-sm text-text-muted">
            {t("unitsCount", {
              selected: form.unitIds.length,
              total: context.units.length,
            })}
          </p>
        </div>
        <p className="type-body-sm text-text-secondary">{t("unitsIntro")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {context.units.map((unit) => {
            const selected = form.unitIds.includes(unit.id);
            return (
              <label
                key={unit.id}
                className={`flex cursor-pointer gap-3 rounded-[12px] p-4 ${
                  selected
                    ? "border-2 border-border-selected bg-background-selected"
                    : "border border-border-default bg-background-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => wizard.toggleUnit(unit.id)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--color-action-primary-bg)]"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={`type-label ${selected ? "text-text-accent" : "text-text-primary"}`}
                  >
                    {unit.name}
                  </span>
                  <span className="type-caption text-text-muted">
                    {unit.teamNames.join(" · ")}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col p-0">
        <div className="flex flex-col gap-1 px-6 py-5">
          <h2 className="type-title-card text-text-primary">
            {t("skillsTitle")}
          </h2>
          <p className="type-body-sm text-text-secondary">{t("skillsIntro")}</p>
        </div>
        {wizard.skillGroups.map(({ unit, skills, selected }) => (
          <section key={unit.id} aria-label={unit.name}>
            <div className="flex items-center gap-2 bg-background-subtle px-6 py-2.5">
              <p
                className={`flex-1 type-overline uppercase ${selected ? "text-text-secondary" : "text-text-muted"}`}
              >
                {unit.name.toLocaleUpperCase("tr")}
              </p>
              <p className="type-caption text-text-muted">
                {!selected
                  ? t("hidden")
                  : skills.length === 0
                    ? t("noSkills")
                    : t("skillCount", { count: skills.length })}
              </p>
            </div>
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex flex-col gap-2 border-t border-border-subtle px-6 py-2.5 sm:flex-row sm:items-center sm:gap-4"
              >
                <p className="flex-1 type-label text-text-primary">
                  {skill.name}
                </p>
                <LevelPicker
                  label={t("levelLabel", { skill: skill.name })}
                  selected={wizard.levelOf(skill.id)}
                  onSelect={(level) => wizard.setSkillLevel(skill.id, level)}
                />
              </div>
            ))}
          </section>
        ))}
        <p className="px-6 py-3 type-caption text-text-muted">{t("shared")}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="type-title-card text-text-primary">
          {t("rolesTitle", { max: ISKUR_TEAM_ROLES_MAX })}
        </h2>
        <div className="flex flex-wrap gap-2">
          {ISKUR_TEAM_ROLE_OPTIONS.map((role) => {
            const selected = form.teamRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                aria-pressed={selected}
                disabled={!selected && wizard.teamRolesFull}
                onClick={() => wizard.toggleTeamRole(role)}
                className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 type-label focus-visible:outline-2 focus-visible:outline-border-selected disabled:opacity-50 ${
                  selected
                    ? "border-border-selected bg-background-selected text-text-accent"
                    : "border-border-default bg-background-surface text-text-primary"
                }`}
              >
                {selected ? (
                  <Image
                    src="/ia/profile/chip-check.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                ) : null}
                {t(`role.${role}`)}
              </button>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function RecordField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="type-label text-text-primary">{label}</p>
      <p className="flex h-12 items-center rounded-input border border-dashed border-border-default bg-background-subtle px-4 type-body text-text-primary">
        {value}
      </p>
      <p className="flex items-center gap-1 type-caption text-text-secondary">
        <Image src="/ia/profile/info-alt.svg" alt="" width={16} height={16} />
        {note}
      </p>
    </div>
  );
}

/** Yok / Başlangıç / İyi / Uzman; a rating can also still be missing, which the kit's Segmented cannot show. */
function LevelPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: IskurSkillLevel | null;
  onSelect: (level: IskurSkillLevel) => void;
}) {
  const t = useTranslations("iskurOnboarding.units.level");
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 self-start rounded-[10px] bg-background-subtle p-1"
    >
      {LEVELS.map((level) => {
        const active = level === selected;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(level)}
            className={`rounded-[8px] px-3 py-1.5 type-label-sm focus-visible:outline-2 focus-visible:outline-border-selected ${
              active
                ? "border border-border-default bg-background-surface text-text-primary"
                : "text-text-muted"
            }`}
          >
            {t(level)}
          </button>
        );
      })}
    </div>
  );
}
