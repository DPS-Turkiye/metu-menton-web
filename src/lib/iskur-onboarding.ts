import {
  IskurTeamRolePreference,
  type IskurOnboardingForm,
  type IskurOnboardingInput,
  type IskurOnboardingUnit,
  type IskurScheduleRange,
  type IskurSkill,
  type IskurTeamMember,
} from "@/interfaces/iskur-onboarding";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { WEEKDAY_ORDER, type Weekday } from "@/interfaces/mentor";
import { ISKUR_MINUTES_PER_DAY } from "@/lib/iskur-workspace";
import { withoutKeys } from "@/lib/keyed-list";
import {
  IskurOnboardingStep,
  type IskurLeadershipEligibility,
  type IskurRangeRow,
} from "@/types/iskur-onboarding";

export const ISKUR_ONBOARDING_HREF = "/iskur/onboarding";
/** Set by "Sonra hatırlat"; lasts until the browser closes, so the form is asked for again next time. */
export const ISKUR_ONBOARDING_LATER_COOKIE = "iskur_onboarding_later";
/** Each leadership answer, as the backend and Figma 04's counter allow. */
export const ISKUR_ANSWER_MAX = 500;
export const ISKUR_TEAM_ROLES_MAX = 2;
export const ISKUR_RANGES_PER_DAY_MAX = 4;
/** Figma 01: "PDF, en fazla 10 MB". */
export const ISKUR_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ISKUR_SKILL_NAME_MAX = 80;
export const ISKUR_UNIT_SKILLS_MAX = 30;
export const ISKUR_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const ISKUR_TEAM_ROLE_OPTIONS = [
  IskurTeamRolePreference.IdeaGenerator,
  IskurTeamRolePreference.Planner,
  IskurTeamRolePreference.Executor,
  IskurTeamRolePreference.Connector,
] as const;

/** The form's steps after the welcome screen, as the "Adımlar" card lists them. */
export const ISKUR_FORM_STEPS = [
  IskurOnboardingStep.Days,
  IskurOnboardingStep.Units,
  IskurOnboardingStep.Documents,
  IskurOnboardingStep.Leadership,
  IskurOnboardingStep.Preview,
] as const;
export type IskurFormStep = (typeof ISKUR_FORM_STEPS)[number];

/** Minutes since midnight for "HH:mm", or null for anything else. */
export function minutesOf(time: string): number | null {
  if (!ISKUR_TIME_PATTERN.test(time)) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** A range's length in minutes; 0 while either end is unfinished or it runs backwards. */
export function rangeMinutes(range: IskurScheduleRange): number {
  const start = minutesOf(range.start);
  const end = minutesOf(range.end);
  if (start === null || end === null || end <= start) return 0;
  return end - start;
}

export function scheduleMinutes(ranges: readonly IskurScheduleRange[]) {
  return ranges.reduce((total, range) => total + rangeMinutes(range), 0);
}

export function dayMinutes(
  ranges: readonly IskurScheduleRange[],
  day: Weekday,
) {
  return scheduleMinutes(ranges.filter((range) => range.day === day));
}

/** The week's target: 7.5 hours per chosen day. */
export function targetMinutes(weeklyDays: number | null) {
  return weeklyDays === null ? 0 : weeklyDays * ISKUR_MINUTES_PER_DAY;
}

/** The days that have at least one range, Monday first. */
export function scheduledDays(ranges: readonly IskurScheduleRange[]) {
  return WEEKDAY_ORDER.filter((day) =>
    ranges.some((range) => range.day === day),
  );
}

/** Two ranges on the same day that overlap; touching ends (10:00–12:00, 12:00–14:00) are fine. */
export function hasOverlap(ranges: readonly IskurScheduleRange[]) {
  return WEEKDAY_ORDER.some((day) => {
    const spans = ranges
      .filter((range) => range.day === day)
      .map((range) => [minutesOf(range.start), minutesOf(range.end)] as const)
      .filter(
        (span): span is readonly [number, number] =>
          span[0] !== null && span[1] !== null,
      )
      .toSorted((a, b) => a[0] - b[0]);
    return spans.some((span, index) => {
      const previous = spans[index - 1];
      return previous !== undefined && span[0] < previous[1];
    });
  });
}

/** Every range is a finished, forward "HH:mm–HH:mm" and none of them collide. */
export function scheduleIsValid(ranges: readonly IskurScheduleRange[]) {
  return (
    ranges.every((range) => rangeMinutes(range) > 0) && !hasOverlap(ranges)
  );
}

/** Step 1 is done when the hours add up to exactly the chosen days ("Toplam 22,5 sa = 3 tam gün ✓"). */
export function scheduleMatches(
  weeklyDays: number | null,
  ranges: readonly IskurScheduleRange[],
) {
  return (
    weeklyDays !== null &&
    ranges.length > 0 &&
    scheduleIsValid(ranges) &&
    scheduleMinutes(ranges) === targetMinutes(weeklyDays)
  );
}

/** Hours with one decimal in the reader's language: 450 → "7,5" in Turkish. */
export function formatHours(minutes: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    minutes / 60,
  );
}

/** İŞKUR days left of the 140; never below zero. */
export function remainingIskurDays(prior: number | null, maxDays: number) {
  return Math.max(0, maxDays - (prior ?? 0));
}

/** About how many İŞKUR days this term takes: Figma 02's "yaklaşık 72 gün" for 3 days over 24 weeks. */
export function neededIskurDays(weeklyDays: number | null, termWeeks: number) {
  return (weeklyDays ?? 0) * termWeeks;
}

/**
 * The skills to rate for the chosen units, grouped by unit in the units' order. A skill an earlier chosen unit
 * already asks about is not asked again ("İki birimde de geçen yetkinlikler bir kez sorulur").
 */
export function askedSkillGroups(
  units: readonly IskurOnboardingUnit[],
  selectedUnitIds: readonly string[],
): { unit: IskurOnboardingUnit; skills: IskurSkill[]; selected: boolean }[] {
  const asked = new Set<string>();
  return units.map((unit) => {
    const selected = selectedUnitIds.includes(unit.id);
    if (!selected) return { unit, skills: [], selected };
    const skills = unit.skills.filter((skill) => {
      if (asked.has(skill.id)) return false;
      asked.add(skill.id);
      return true;
    });
    return { unit, skills, selected };
  });
}

export function askedSkillIds(
  units: readonly IskurOnboardingUnit[],
  selectedUnitIds: readonly string[],
) {
  return askedSkillGroups(units, selectedUnitIds).flatMap((group) =>
    group.skills.map((skill) => skill.id),
  );
}

export function leadershipEligibility(input: {
  weeklyDays: number | null;
  priorIskurDays: number | null;
  hasCv: boolean;
  documentsEnabled: boolean;
  termWeeks: number;
  minimumLeaderDays: number;
  maxIskurDays: number;
}): IskurLeadershipEligibility {
  const enoughDays = (input.weeklyDays ?? 0) >= input.minimumLeaderDays;
  const enoughDaysLeft =
    remainingIskurDays(input.priorIskurDays, input.maxIskurDays) >=
    neededIskurDays(input.weeklyDays, input.termWeeks);
  const hasCv = !input.documentsEnabled || input.hasCv;
  return {
    enoughDays,
    enoughDaysLeft,
    hasCv,
    eligible: enoughDays && enoughDaysLeft && hasCv,
  };
}

/** Each leadership answer is written and within the limit. */
export function leadershipAnswered(
  form: Pick<IskurOnboardingForm, "leadership">,
) {
  const { motivation, experience, conflict } = form.leadership;
  return [motivation, experience, conflict].every(
    (answer) =>
      answer !== null &&
      answer.trim().length > 0 &&
      answer.length <= ISKUR_ANSWER_MAX,
  );
}

/** The form as the screen holds it, in the shape the backend saves; ratings of unchosen units stay until submit. */
export function onboardingInput(
  form: IskurOnboardingForm,
  rows: readonly IskurRangeRow[],
): IskurOnboardingInput {
  return {
    weeklyDays: form.weeklyDays,
    schedule: withoutKeys(rows),
    priorIskurDays: form.priorIskurDays,
    unitIds: form.unitIds,
    skills: form.skills,
    teamRoles: form.teamRoles,
    leadership: form.leadership.wants
      ? form.leadership
      : { wants: false, motivation: null, experience: null, conflict: null },
  };
}

/** Whether a step's own questions are answered; "Devam et" waits for it. */
export function stepComplete(
  step: IskurOnboardingStep,
  form: IskurOnboardingForm,
  rows: readonly IskurScheduleRange[],
  units: readonly IskurOnboardingUnit[],
  documentsEnabled: boolean,
  eligibility: IskurLeadershipEligibility,
) {
  switch (step) {
    case IskurOnboardingStep.Welcome:
    case IskurOnboardingStep.Preview:
      return true;
    case IskurOnboardingStep.Days:
      return (
        scheduleMatches(form.weeklyDays, rows) && form.priorIskurDays !== null
      );
    case IskurOnboardingStep.Units: {
      const rated = new Set(form.skills.map((answer) => answer.skillId));
      return (
        form.unitIds.length > 0 &&
        askedSkillIds(units, form.unitIds).every((id) => rated.has(id)) &&
        form.teamRoles.length > 0 &&
        form.teamRoles.length <= ISKUR_TEAM_ROLES_MAX
      );
    }
    case IskurOnboardingStep.Documents:
      return !documentsEnabled || form.documents.cv !== null;
    case IskurOnboardingStep.Leadership:
      return (
        !form.leadership.wants ||
        (eligibility.eligible && leadershipAnswered(form))
      );
  }
}

/** A leader with their sub-group, as "Ekibin" lists them (Figma 05); `leader` is null for members without one. */
export interface IskurRevealGroup {
  leader: IskurTeamMember | null;
  members: IskurTeamMember[];
}

/** The team in Figma 05's shape: each leader with their members, then the members who have no leader yet. */
export function revealGroups(
  people: readonly IskurTeamMember[],
): IskurRevealGroup[] {
  const leaders = people.filter(
    (person) => person.role === IskurTeamRole.Leader,
  );
  const groups: IskurRevealGroup[] = leaders.map((leader) => ({
    leader,
    members: people.filter(
      (person) =>
        person.role === IskurTeamRole.Member &&
        person.leaderId === leader.userId,
    ),
  }));
  const unled = people.filter(
    (person) =>
      person.role === IskurTeamRole.Member && person.leaderId === null,
  );
  return unled.length > 0
    ? [...groups, { leader: null, members: unled }]
    : groups;
}

/** The names a unit's skills editor starts from, one per line. */
export function skillNamesText(skills: readonly IskurSkill[]) {
  return skills.map((skill) => skill.name).join("\n");
}

/** The editor's lines as names: trimmed, blank lines dropped, each name once (Turkish case). */
export function skillNamesFromText(text: string) {
  const seen = new Set<string>();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((name) => {
      const key = name.toLocaleLowerCase("tr");
      if (name.length === 0 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const IskurDocumentProblem = {
  TooLarge: "tooLarge",
  NotPdf: "notPdf",
} as const;
export type IskurDocumentProblem =
  (typeof IskurDocumentProblem)[keyof typeof IskurDocumentProblem];

/** Why a chosen file cannot be an onboarding document, before it is sent; the backend checks the content too. */
export function iskurDocumentProblem(file: {
  name: string;
  size: number;
  type: string;
}): IskurDocumentProblem | null {
  if (file.size > ISKUR_DOCUMENT_MAX_BYTES)
    return IskurDocumentProblem.TooLarge;
  const pdf =
    file.type === "application/pdf" ||
    file.name.toLocaleLowerCase("tr").endsWith(".pdf");
  return pdf ? null : IskurDocumentProblem.NotPdf;
}
