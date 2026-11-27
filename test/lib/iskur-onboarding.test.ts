import { describe, expect, it } from "vitest";

import { IskurSkillLevel } from "@/interfaces/iskur-onboarding";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { Weekday } from "@/interfaces/mentor";
import {
  askedSkillGroups,
  askedSkillIds,
  dayMinutes,
  formatHours,
  hasOverlap,
  iskurDocumentProblem,
  IskurDocumentProblem,
  leadershipAnswered,
  leadershipEligibility,
  minutesOf,
  neededIskurDays,
  nextStepsAfterSubmit,
  onboardingInput,
  placementPreference,
  rangeMinutes,
  remainingIskurDays,
  revealGroups,
  scheduledDays,
  scheduleMatches,
  scheduleMinutes,
  skillNamesFromText,
  skillNamesText,
  stepComplete,
  targetMinutes,
} from "@/lib/iskur-onboarding";
import { withKeys } from "@/lib/keyed-list";
import { IskurNextStep, IskurOnboardingStep } from "@/types/iskur-onboarding";
import {
  applications,
  completeForm,
  emptyForm,
  ETKI,
  ETKINLIK,
  GORSEL,
  KREATIF,
  onboarding,
  reveal,
  VIDEO,
} from "@test/fixtures/iskur-onboarding";

const units = onboarding().context.units;
const eligible = {
  enoughDays: true,
  enoughDaysLeft: true,
  hasCv: true,
  eligible: true,
};
const range = (day: Weekday, start: string, end: string) => ({
  day,
  start,
  end,
});

describe("İŞKUR onboarding schedule", () => {
  it("reads only whole HH:mm times", () => {
    expect(minutesOf("09:30")).toBe(570);
    expect(minutesOf("9:30")).toBeNull();
    expect(minutesOf("24:00")).toBeNull();
    expect(minutesOf("")).toBeNull();
  });

  it("counts a range only when it runs forward", () => {
    expect(rangeMinutes(range(Weekday.Monday, "10:00", "13:30"))).toBe(210);
    expect(rangeMinutes(range(Weekday.Monday, "13:30", "10:00"))).toBe(0);
    expect(rangeMinutes(range(Weekday.Monday, "10:00", ""))).toBe(0);
  });

  it("adds Figma 02's week up to three full days", () => {
    const { schedule } = completeForm();
    expect(scheduleMinutes(schedule)).toBe(1350);
    expect(targetMinutes(3)).toBe(1350);
    expect(targetMinutes(null)).toBe(0);
    expect(dayMinutes(schedule, Weekday.Wednesday)).toBe(450);
    expect(scheduledDays(schedule)).toEqual([
      Weekday.Monday,
      Weekday.Tuesday,
      Weekday.Wednesday,
      Weekday.Thursday,
    ]);
    expect(scheduleMatches(3, schedule)).toBe(true);
    expect(scheduleMatches(2, schedule)).toBe(false);
    expect(scheduleMatches(null, schedule)).toBe(false);
    expect(scheduleMatches(1, [])).toBe(false);
  });

  it("finds ranges that overlap on the same day, but not ones that touch", () => {
    expect(
      hasOverlap([
        range(Weekday.Monday, "10:00", "12:00"),
        range(Weekday.Monday, "12:00", "14:00"),
      ]),
    ).toBe(false);
    expect(
      hasOverlap([
        range(Weekday.Monday, "10:00", "12:30"),
        range(Weekday.Monday, "12:00", "14:00"),
      ]),
    ).toBe(true);
    expect(
      hasOverlap([
        range(Weekday.Monday, "10:00", "12:30"),
        range(Weekday.Tuesday, "12:00", "14:00"),
      ]),
    ).toBe(false);
    const overlapping = [
      range(Weekday.Monday, "09:00", "16:30"),
      range(Weekday.Monday, "16:00", "23:30"),
      range(Weekday.Tuesday, "09:00", "16:30"),
    ];
    expect(scheduleMatches(3, overlapping)).toBe(false);
  });

  it("writes hours the Turkish way", () => {
    expect(formatHours(450, "tr")).toBe("7,5");
    expect(formatHours(1350, "tr")).toBe("22,5");
    expect(formatHours(240, "en")).toBe("4");
  });
});

describe("İŞKUR days and leadership", () => {
  it("works out the days left and needed", () => {
    expect(remainingIskurDays(null, 140)).toBe(140);
    expect(remainingIskurDays(150, 140)).toBe(0);
    expect(neededIskurDays(3, 24)).toBe(72);
    expect(neededIskurDays(null, 24)).toBe(0);
  });

  it("needs two days, enough days left and a CV while uploads are on", () => {
    const base = {
      weeklyDays: 3,
      priorIskurDays: 0,
      hasCv: true,
      documentsEnabled: true,
      termWeeks: 24,
      minimumLeaderDays: 2,
      maxIskurDays: 140,
    };
    expect(leadershipEligibility(base).eligible).toBe(true);
    expect(leadershipEligibility({ ...base, weeklyDays: 1 })).toMatchObject({
      enoughDays: false,
      eligible: false,
    });
    expect(
      leadershipEligibility({ ...base, priorIskurDays: 100 }),
    ).toMatchObject({ enoughDaysLeft: false, eligible: false });
    expect(leadershipEligibility({ ...base, hasCv: false })).toMatchObject({
      hasCv: false,
      eligible: false,
    });
    expect(
      leadershipEligibility({ ...base, hasCv: false, documentsEnabled: false }),
    ).toMatchObject({ hasCv: true, eligible: true });
  });

  it("wants all three answers, within 500 characters", () => {
    const answers = {
      wants: true,
      motivation: "Neden",
      experience: "Deneyim",
      conflict: "Çatışma",
    };
    expect(leadershipAnswered({ leadership: answers })).toBe(true);
    expect(
      leadershipAnswered({ leadership: { ...answers, conflict: "  " } }),
    ).toBe(false);
    expect(
      leadershipAnswered({
        leadership: { ...answers, motivation: "a".repeat(501) },
      }),
    ).toBe(false);
  });

  it("adds the leadership interview to the next steps only for an applicant", () => {
    const leadership = {
      wants: false,
      motivation: null,
      experience: null,
      conflict: null,
    };
    expect(nextStepsAfterSubmit({ leadership })).toEqual([
      IskurNextStep.Review,
      IskurNextStep.TeamAssignment,
    ]);
    expect(
      nextStepsAfterSubmit({ leadership: { ...leadership, wants: true } }),
    ).toEqual([
      IskurNextStep.Review,
      IskurNextStep.LeadershipInterview,
      IskurNextStep.TeamAssignment,
    ]);
  });
});

describe("İŞKUR skills", () => {
  it("asks a skill two chosen units share only once, under the first", () => {
    const groups = askedSkillGroups(units, [KREATIF, ETKI]);
    expect(
      groups.map((group) => group.skills.map((skill) => skill.id)),
    ).toEqual([[GORSEL, VIDEO], [ETKINLIK]]);
    expect(askedSkillIds(units, [ETKI])).toEqual([ETKINLIK, VIDEO]);
    expect(askedSkillGroups(units, [ETKI])[0]).toMatchObject({
      selected: false,
      skills: [],
    });
  });

  it("turns the editor's lines into names, each once", () => {
    expect(
      skillNamesFromText(" Görsel tasarım \n\ngörsel TASARIM\nWeb ve UX"),
    ).toEqual(["Görsel tasarım", "Web ve UX"]);
    expect(
      skillNamesText([
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ]),
    ).toBe("A\nB");
  });
});

describe("İŞKUR onboarding steps", () => {
  const complete = completeForm();

  it("needs the days to add up and the prior days for step 1", () => {
    expect(
      stepComplete(
        IskurOnboardingStep.Days,
        complete,
        complete.schedule,
        units,
        false,
        eligible,
      ),
    ).toBe(true);
    const noPrior = { ...complete, priorIskurDays: null };
    expect(
      stepComplete(
        IskurOnboardingStep.Days,
        noPrior,
        complete.schedule,
        units,
        false,
        eligible,
      ),
    ).toBe(false);
    expect(
      stepComplete(
        IskurOnboardingStep.Days,
        complete,
        complete.schedule.slice(1),
        units,
        false,
        eligible,
      ),
    ).toBe(false);
  });

  it("needs a unit, every asked skill and one or two roles for step 2", () => {
    expect(
      stepComplete(
        IskurOnboardingStep.Units,
        complete,
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(true);
    const unrated = {
      ...complete,
      skills: [{ skillId: GORSEL, level: IskurSkillLevel.Good }],
    };
    expect(
      stepComplete(
        IskurOnboardingStep.Units,
        unrated,
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(false);
    expect(
      stepComplete(
        IskurOnboardingStep.Units,
        { ...complete, teamRoles: [] },
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(false);
    expect(
      stepComplete(
        IskurOnboardingStep.Units,
        { ...complete, unitIds: [] },
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(false);
  });

  it("needs a CV only while uploads are on", () => {
    expect(
      stepComplete(
        IskurOnboardingStep.Documents,
        complete,
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(true);
    expect(
      stepComplete(
        IskurOnboardingStep.Documents,
        complete,
        [],
        units,
        true,
        eligible,
      ),
    ).toBe(false);
    const withCv = {
      ...complete,
      documents: {
        cv: { fileName: "cv.pdf", sizeBytes: 1, uploadedAt: "x" },
        transcript: null,
      },
    };
    expect(
      stepComplete(
        IskurOnboardingStep.Documents,
        withCv,
        [],
        units,
        true,
        eligible,
      ),
    ).toBe(true);
  });

  it("lets the leadership step pass when not applying, and asks for eligibility and answers when applying", () => {
    expect(
      stepComplete(
        IskurOnboardingStep.Leadership,
        complete,
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(true);
    const applying = {
      ...complete,
      leadership: {
        wants: true,
        motivation: "a",
        experience: "b",
        conflict: "c",
      },
    };
    expect(
      stepComplete(
        IskurOnboardingStep.Leadership,
        applying,
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(true);
    expect(
      stepComplete(IskurOnboardingStep.Leadership, applying, [], units, false, {
        ...eligible,
        eligible: false,
      }),
    ).toBe(false);
    expect(
      stepComplete(
        IskurOnboardingStep.Preview,
        emptyForm(),
        [],
        units,
        false,
        eligible,
      ),
    ).toBe(true);
  });

  it("sends the rows without their keys and drops answers of a withdrawn application", () => {
    const form = {
      ...complete,
      leadership: {
        wants: false,
        motivation: "taslak",
        experience: null,
        conflict: null,
      },
    };
    const input = onboardingInput(form, withKeys(complete.schedule));
    expect(input.schedule).toEqual(complete.schedule);
    expect(input.leadership).toEqual({
      wants: false,
      motivation: null,
      experience: null,
      conflict: null,
    });
    expect(input).not.toHaveProperty("documents");
  });
});

describe("İŞKUR documents and the team", () => {
  it("refuses files over 10 MB and anything but a PDF before sending", () => {
    expect(
      iskurDocumentProblem({
        name: "cv.pdf",
        size: 1024,
        type: "application/pdf",
      }),
    ).toBeNull();
    expect(
      iskurDocumentProblem({ name: "CV.PDF", size: 1024, type: "" }),
    ).toBeNull();
    expect(
      iskurDocumentProblem({
        name: "cv.pdf",
        size: 11 * 1024 * 1024,
        type: "application/pdf",
      }),
    ).toBe(IskurDocumentProblem.TooLarge);
    expect(
      iskurDocumentProblem({
        name: "cv.docx",
        size: 1024,
        type: "application/msword",
      }),
    ).toBe(IskurDocumentProblem.NotPdf);
  });

  it("groups the team by leader and keeps the members without one apart", () => {
    const people = reveal().placement?.team.people ?? [];
    expect(
      revealGroups(people).map((group) => [
        group.leader?.fullName,
        group.members.map((m) => m.fullName),
      ]),
    ).toEqual([
      ["Can Tekin", ["Deniz Arslan"]],
      ["Zeynep Kaya", ["Mert Demir"]],
    ]);
    const orphan = {
      userId: "x",
      fullName: "Ece Kurt",
      role: IskurTeamRole.Member,
      leaderId: null,
      me: false,
    };
    expect(revealGroups([...people, orphan]).at(-1)).toEqual({
      leader: null,
      members: [orphan],
    });
  });

  it("scores each chosen unit by the intern's own skill levels for the placement dialog", () => {
    const sent = applications();
    const [application] = sent.applications;
    if (!application) throw new Error("fixture has no application");
    expect(placementPreference(application, sent.units)).toEqual({
      weeklyDays: 3,
      wantsLeadership: true,
      unitScores: { [KREATIF]: 3 },
    });
    expect(
      placementPreference(
        {
          ...application,
          weeklyDays: null,
          unitIds: [ETKI, KREATIF, "gone"],
          skills: [
            { skillId: GORSEL, level: IskurSkillLevel.Expert },
            { skillId: VIDEO, level: IskurSkillLevel.None },
          ],
          leadership: { ...application.leadership, wants: false },
        },
        sent.units,
      ),
    ).toEqual({
      weeklyDays: null,
      wantsLeadership: false,
      unitScores: { [ETKI]: 0, [KREATIF]: 3, gone: 0 },
    });
  });
});
