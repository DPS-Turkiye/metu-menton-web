import {
  IskurSkillLevel,
  IskurTeamRolePreference,
  type IskurApplications,
  type IskurOnboarding,
  type IskurOnboardingForm,
  type IskurTeamReveal,
} from "@/interfaces/iskur-onboarding";
import {
  IskurPlacementStatus,
  IskurTeamRole,
} from "@/interfaces/iskur-workspace";
import { Weekday } from "@/interfaces/mentor";

export const KREATIF = "00000000-0000-4000-8000-0000000000a1";
export const ETKI = "00000000-0000-4000-8000-0000000000a4";
export const GORSEL = "00000000-0000-4000-8000-0000000000b1";
export const VIDEO = "00000000-0000-4000-8000-0000000000b2";
export const ETKINLIK = "00000000-0000-4000-8000-0000000000b3";
export const MERT = "00000000-0000-4000-8000-0000000000c1";
export const ZEYNEP = "00000000-0000-4000-8000-0000000000c2";
export const CAN = "00000000-0000-4000-8000-0000000000c3";
export const DENIZ = "00000000-0000-4000-8000-0000000000c4";

export function emptyForm(
  overrides: Partial<IskurOnboardingForm> = {},
): IskurOnboardingForm {
  return {
    weeklyDays: null,
    schedule: [],
    priorIskurDays: null,
    unitIds: [],
    skills: [],
    teamRoles: [],
    documents: { cv: null, transcript: null },
    leadership: {
      wants: false,
      motivation: null,
      experience: null,
      conflict: null,
    },
    submittedAt: null,
    ...overrides,
  };
}

/** Figma 02–03's Mert: three days, Kreatif ve Dijital Üretim, two roles. */
export function completeForm(
  overrides: Partial<IskurOnboardingForm> = {},
): IskurOnboardingForm {
  return emptyForm({
    weeklyDays: 3,
    schedule: [
      { day: Weekday.Monday, start: "10:00", end: "14:00" },
      { day: Weekday.Tuesday, start: "10:00", end: "13:30" },
      { day: Weekday.Wednesday, start: "09:00", end: "13:00" },
      { day: Weekday.Wednesday, start: "14:00", end: "17:30" },
      { day: Weekday.Thursday, start: "09:00", end: "16:30" },
    ],
    priorIskurDays: 0,
    unitIds: [KREATIF],
    skills: [
      { skillId: GORSEL, level: IskurSkillLevel.Good },
      { skillId: VIDEO, level: IskurSkillLevel.Beginner },
    ],
    teamRoles: [
      IskurTeamRolePreference.IdeaGenerator,
      IskurTeamRolePreference.Executor,
    ],
    ...overrides,
  });
}

export function onboarding(
  form: IskurOnboardingForm = emptyForm(),
  documentsEnabled = false,
): IskurOnboarding {
  return {
    form,
    context: {
      programId: "p1",
      programName: "İŞKUR Güz 2026",
      department: "Endüstri Mühendisliği",
      classYear: 3,
      units: [
        {
          id: KREATIF,
          name: "Kreatif ve Dijital Üretim",
          teamNames: [
            "Medya ve Kreatif Üretim",
            "Dijital Dönüşüm ve Teknoloji",
          ],
          skills: [
            { id: GORSEL, name: "Görsel tasarım" },
            { id: VIDEO, name: "Video ve fotoğraf" },
          ],
        },
        {
          id: ETKI,
          name: "Etki ve Organizasyon",
          teamNames: [
            "Sürdürülebilirlik ve Sosyal Etki",
            "Etkinlik ve Topluluk Yönetimi",
          ],
          skills: [
            { id: ETKINLIK, name: "Etkinlik organizasyonu" },
            { id: VIDEO, name: "Video ve fotoğraf" },
          ],
        },
      ],
      documentsEnabled,
      maxIskurDays: 140,
      termWeeks: 24,
      minimumLeaderDays: 2,
      maxTeamRoles: 2,
      answerMaxLength: 500,
    },
  };
}

export function reveal(
  overrides: Partial<IskurTeamReveal> = {},
): IskurTeamReveal {
  return {
    programId: "p1",
    programName: "İŞKUR Güz 2026",
    onboardingSubmitted: true,
    placement: {
      status: IskurPlacementStatus.Provisional,
      trialWeek: 1,
      myRole: IskurTeamRole.Member,
      myLeader: { userId: ZEYNEP, fullName: "Zeynep Kaya" },
      unit: {
        name: "Kreatif ve Dijital Üretim",
        coordinator: { userId: "coord", fullName: "Selin Er" },
      },
      team: {
        name: "Medya ve Kreatif Üretim",
        people: [
          {
            userId: CAN,
            fullName: "Can Tekin",
            role: IskurTeamRole.Leader,
            leaderId: null,
            me: false,
          },
          {
            userId: DENIZ,
            fullName: "Deniz Arslan",
            role: IskurTeamRole.Member,
            leaderId: CAN,
            me: false,
          },
          {
            userId: ZEYNEP,
            fullName: "Zeynep Kaya",
            role: IskurTeamRole.Leader,
            leaderId: null,
            me: false,
          },
          {
            userId: MERT,
            fullName: "Mert Demir",
            role: IskurTeamRole.Member,
            leaderId: ZEYNEP,
            me: true,
          },
        ],
      },
      commonDays: [Weekday.Tuesday, Weekday.Thursday],
    },
    ...overrides,
  };
}

export function applications(): IskurApplications {
  const form = completeForm({
    leadership: {
      wants: true,
      motivation: "Neden",
      experience: "Deneyim",
      conflict: "Çatışma",
    },
    documents: {
      cv: {
        fileName: "cv.pdf",
        sizeBytes: 2048,
        uploadedAt: "2026-11-19T10:00:00Z",
      },
      transcript: null,
    },
  });
  return {
    programId: "p1",
    units: [
      {
        id: KREATIF,
        name: "Kreatif ve Dijital Üretim",
        skills: [
          { id: GORSEL, name: "Görsel tasarım" },
          { id: VIDEO, name: "Video ve fotoğraf" },
        ],
      },
      { id: ETKI, name: "Etki ve Organizasyon", skills: [] },
    ],
    applications: [
      {
        userId: MERT,
        fullName: "Mert Demir",
        submittedAt: "2026-11-19T10:00:00Z",
        weeklyDays: form.weeklyDays,
        schedule: form.schedule,
        priorIskurDays: 0,
        remainingIskurDays: 140,
        unitIds: form.unitIds,
        skills: form.skills,
        teamRoles: form.teamRoles,
        documents: form.documents,
        leadership: form.leadership,
      },
    ],
    drafts: 2,
  };
}
