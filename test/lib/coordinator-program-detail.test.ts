import { describe, expect, it } from "vitest";

import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { ProgramFeature, ProgramType } from "@/interfaces/program";
import {
  emptyPhase,
  hasTabContent,
  healthShares,
  isActiveTab,
  misplacedTabHref,
  overviewActions,
  ParticipantTab,
  participantTabs,
  phaseDraftError,
  programHeaderLine,
  ProgramTab,
  programTabs,
  RULE_LIMITS,
  savedPhases,
  settingsDraftError,
  settingsDraftOf,
  SettingsSection,
  settingsSections,
  stepDays,
  studentsAreOfficeHours,
} from "@/lib/coordinator-program-detail";
import { coordinatorProgramDetail } from "@test/fixtures/coordinator-programs";
import { translatorIn } from "@test/translators";

const t = translatorIn("tr", "coordinatorPrograms");
const tEn = translatorIn("en", "coordinatorPrograms");

describe("coordinator program detail", () => {
  it("writes the header line with the phase, week and every coordinator", () => {
    expect(programHeaderLine(coordinatorProgramDetail(), t, "tr")).toContain(
      "Mentorluk dönemi, hafta 6/16 · Koordinatörler: Elif Demir, Burcu Şen",
    );
    expect(programHeaderLine(coordinatorProgramDetail(), tEn, "en")).toContain(
      "Mentorluk dönemi, week 6/16 · Coordinators: Elif Demir, Burcu Şen",
    );
  });

  it("splits the health bar and lists only the actions that need someone", () => {
    const detail = coordinatorProgramDetail();
    const shares = healthShares(detail.health);
    expect(shares.total).toBe(64);
    expect(Math.round(shares.healthy + shares.followUp + shares.risky)).toBe(
      100,
    );
    expect(overviewActions(detail, t).map((action) => action.title)).toEqual([
      "5 takım eşleşme bekliyor",
      "5 mentor yanıt bekliyor",
      "4 görüşme: not eksik",
    ]);
    expect(overviewActions(detail, tEn).map((action) => action.title)).toEqual([
      "5 teams are waiting for a match",
      "5 mentors haven't replied",
      "4 meetings: notes missing",
    ]);
    expect(
      overviewActions(
        coordinatorProgramDetail({
          program: { ...detail.program, awaitingMatchCount: 0 },
          mentors: { ...detail.mentors, pending: 0 },
          missingNoteMeetings: 0,
        }),
        t,
      ),
    ).toEqual([]);
  });

  it("keeps rule days inside their limits", () => {
    expect(stepDays(1, -1, RULE_LIMITS.meetingFrequencyDays)).toBe(1);
    expect(stepDays(90, 1, RULE_LIMITS.meetingFrequencyDays)).toBe(90);
    expect(stepDays(14, 1, RULE_LIMITS.staleAfterDays)).toBe(15);
  });

  it("validates the settings draft, and each phase on its own", () => {
    const detail = coordinatorProgramDetail();
    const draft = settingsDraftOf(detail);
    expect(settingsDraftError(draft)).toBeNull();
    expect(settingsDraftError({ ...draft, name: " " })).toBe(
      "Program adı gerekli.",
    );
    expect(
      settingsDraftError({
        ...draft,
        startDate: "2026-09-10",
        endDate: "2026-09-01",
      }),
    ).toBe("Program bitişi başlangıçtan önce olamaz.");
    expect(savedPhases(detail).map((phase) => phase.name)).toEqual([
      "Başvuru",
      "Mentorluk dönemi",
      "Demo Day",
    ]);
    expect(phaseDraftError(emptyPhase())).toBe("Her fazın bir adı olmalı.");
    expect(
      phaseDraftError({
        ...emptyPhase(),
        name: "Demo Day",
        startDate: "2026-12-10",
        endDate: "2026-12-01",
      }),
    ).toContain("Demo Day");
  });
});

describe("program tabs by type", () => {
  function detailOf(type: ProgramType) {
    const detail = coordinatorProgramDetail();
    return { ...detail, program: { ...detail.program, type } };
  }

  it("keeps Girişim's screens under Katılımcılar with their counts", () => {
    const detail = detailOf(ProgramType.StartupMentoring);
    expect(
      programTabs(detail, "p1").map((tab) => [tab.id, tab.href, tab.count]),
    ).toEqual([
      [ProgramTab.Overview, "/coordinator/programs/p1", null],
      [ProgramTab.Participants, "/coordinator/programs/p1/teams", null],
      [ProgramTab.Matching, "/coordinator/programs/p1/matching", 5],
      [ProgramTab.Approvals, "/coordinator/programs/p1/approvals", 6],
      [ProgramTab.Settings, "/coordinator/programs/p1/settings", null],
    ]);
    expect(participantTabs(detail, "p1")).toEqual([
      {
        id: ParticipantTab.Teams,
        href: "/coordinator/programs/p1/teams",
        count: detail.program.teamCount,
        waiting: null,
      },
      {
        id: ParticipantTab.MentorPool,
        href: "/coordinator/programs/p1/mentors",
        count: detail.program.mentorCount,
        waiting: null,
      },
    ]);
    expect(
      participantTabs(detail, "p1", { teams: 2, mentors: 3 }).map(
        (tab) => `${tab.id}:${tab.count}+${tab.waiting}`,
      ),
    ).toEqual([
      `${ParticipantTab.Teams}:${detail.program.teamCount}+2`,
      `${ParticipantTab.MentorPool}:${detail.program.mentorCount}+3`,
    ]);
    expect(isActiveTab(ProgramTab.Participants, ProgramTab.MentorPool)).toBe(
      true,
    );
    expect(isActiveTab(ProgramTab.Matching, ProgramTab.MentorPool)).toBe(false);
  });

  it("gives Office Hours Randevular in place of Eşleşmeler and no Onaylar", () => {
    const detail = detailOf(ProgramType.OfficeHours);
    expect(programTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ProgramTab.Overview,
      ProgramTab.Participants,
      ProgramTab.Appointments,
      ProgramTab.Settings,
    ]);
    expect(participantTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ParticipantTab.Academics,
      ParticipantTab.Students,
    ]);
  });

  it("gives Akran its Öğrenciler and Akran Mentorları lists and leaves its other tabs empty but the settings", () => {
    const detail = detailOf(ProgramType.PeerMentoring);
    expect(programTabs(detail, "p1")[1]?.href).toBe(
      "/coordinator/programs/p1/students",
    );
    expect(
      programTabs({ ...detail, pendingApprovalCount: 0 }, "p1").find(
        (tab) => tab.id === ProgramTab.Approvals,
      )?.count,
    ).toBe(0);
    expect(participantTabs(detail, "p1")).toEqual([
      {
        id: ParticipantTab.Students,
        href: "/coordinator/programs/p1/students",
        count: null,
      },
      {
        id: ParticipantTab.PeerMentors,
        href: "/coordinator/programs/p1/peer-mentors",
        count: null,
      },
      {
        id: ParticipantTab.IskurTeams,
        href: "/coordinator/programs/p1/iskur",
        count: null,
      },
      {
        id: ParticipantTab.IskurChannels,
        href: "/coordinator/programs/p1/iskur/messages",
        count: null,
      },
    ]);
    expect(
      hasTabContent(detailOf(ProgramType.PeerMentoring), ProgramTab.IskurTeams),
    ).toBe(true);
    expect(
      hasTabContent(
        detailOf(ProgramType.PeerMentoring),
        ProgramTab.IskurChannels,
      ),
    ).toBe(true);
    expect(
      hasTabContent(detailOf(ProgramType.PeerMentoring), ProgramTab.Students),
    ).toBe(true);
    expect(
      hasTabContent(
        detailOf(ProgramType.PeerMentoring),
        ProgramTab.PeerMentors,
      ),
    ).toBe(true);
    expect(
      hasTabContent(detailOf(ProgramType.PeerMentoring), ProgramTab.Matching),
    ).toBe(false);
    expect(
      hasTabContent(detailOf(ProgramType.PeerMentoring), ProgramTab.Settings),
    ).toBe(true);
    expect(
      hasTabContent(
        detailOf(ProgramType.StartupMentoring),
        ProgramTab.Approvals,
      ),
    ).toBe(true);
  });

  it("sends tab URLs a type does not show to that type's own tab", () => {
    const base = "/coordinator/programs/p1";
    const startup = detailOf(ProgramType.StartupMentoring);
    const peer = detailOf(ProgramType.PeerMentoring);
    const officeHours = detailOf(ProgramType.OfficeHours);

    expect(misplacedTabHref(startup, "p1", ProgramTab.Participants)).toBe(
      `${base}/teams`,
    );
    expect(misplacedTabHref(startup, "p1", ProgramTab.Appointments)).toBe(
      `${base}/matching`,
    );
    for (const tab of [
      ProgramTab.Overview,
      ProgramTab.Teams,
      ProgramTab.MentorPool,
      ProgramTab.Matching,
      ProgramTab.Approvals,
      ProgramTab.Settings,
    ]) {
      expect(misplacedTabHref(startup, "p1", tab)).toBeNull();
    }

    expect(misplacedTabHref(officeHours, "p1", ProgramTab.Teams)).toBe(
      `${base}/academics`,
    );
    expect(misplacedTabHref(officeHours, "p1", ProgramTab.Participants)).toBe(
      `${base}/academics`,
    );
    expect(
      misplacedTabHref(officeHours, "p1", ProgramTab.Academics),
    ).toBeNull();
    expect(misplacedTabHref(peer, "p1", ProgramTab.Academics)).toBe(
      `${base}/students`,
    );
    expect(misplacedTabHref(startup, "p1", ProgramTab.Academics)).toBe(
      `${base}/teams`,
    );
    expect(misplacedTabHref(officeHours, "p1", ProgramTab.Matching)).toBe(
      `${base}/appointments`,
    );
    expect(misplacedTabHref(officeHours, "p1", ProgramTab.Approvals)).toBe(
      base,
    );
    expect(
      misplacedTabHref(officeHours, "p1", ProgramTab.Appointments),
    ).toBeNull();

    expect(misplacedTabHref(peer, "p1", ProgramTab.MentorPool)).toBe(
      `${base}/students`,
    );
    expect(misplacedTabHref(peer, "p1", ProgramTab.Participants)).toBe(
      `${base}/students`,
    );
    expect(misplacedTabHref(peer, "p1", ProgramTab.Students)).toBeNull();
    expect(misplacedTabHref(startup, "p1", ProgramTab.PeerMentors)).toBe(
      `${base}/teams`,
    );
    expect(misplacedTabHref(officeHours, "p1", ProgramTab.Students)).toBeNull();
    expect(misplacedTabHref(peer, "p1", ProgramTab.Appointments)).toBe(
      `${base}/matching`,
    );
    expect(misplacedTabHref(peer, "p1", ProgramTab.Approvals)).toBeNull();
  });
});

describe("settingsSections", () => {
  const sectionsOf = (type: ProgramType, lifecycle: ProgramLifecycle) =>
    settingsSections({ type, lifecycle, features: [], myFeatures: [] });

  it("gives only a peer program the Akran Mentoru training", () => {
    expect(
      sectionsOf(ProgramType.PeerMentoring, ProgramLifecycle.Active),
    ).toContain(SettingsSection.Training);
    expect(
      sectionsOf(ProgramType.StartupMentoring, ProgramLifecycle.Active),
    ).not.toContain(SettingsSection.Training);
    expect(
      sectionsOf(ProgramType.OfficeHours, ProgramLifecycle.Active),
    ).not.toContain(SettingsSection.Training);
  });

  it("lists Akran kategorileri only for peer programs, before Arşiv, and no Arşiv for a draft", () => {
    const peer = sectionsOf(ProgramType.PeerMentoring, ProgramLifecycle.Active);
    expect(peer).toContain(SettingsSection.PeerCategories);
    expect(peer.indexOf(SettingsSection.PeerCategories)).toBe(
      peer.indexOf(SettingsSection.Archive) - 1,
    );
    expect(
      sectionsOf(ProgramType.StartupMentoring, ProgramLifecycle.Active),
    ).not.toContain(SettingsSection.PeerCategories);
    expect(
      sectionsOf(ProgramType.OfficeHours, ProgramLifecycle.Active),
    ).not.toContain(SettingsSection.PeerCategories);
    expect(
      sectionsOf(ProgramType.PeerMentoring, ProgramLifecycle.Draft),
    ).not.toContain(SettingsSection.Archive);
  });
});

describe("a semester's tabs by its features", () => {
  const { PeerMentoring: Peer, OfficeHours: Oh, Iskur } = ProgramFeature;
  const base = "/coordinator/programs/p1";

  function semester(
    features: ProgramFeature[],
    myFeatures: ProgramFeature[] = features,
    lifecycle = ProgramLifecycle.Active,
  ) {
    const detail = coordinatorProgramDetail();
    return {
      ...detail,
      program: {
        ...detail.program,
        type: ProgramType.Semester,
        features,
        myFeatures,
        lifecycle,
      },
    };
  }

  it("shows every feature's tabs when the semester runs all three", () => {
    const detail = semester([Peer, Oh, Iskur]);
    expect(programTabs(detail, "p1").map((tab) => [tab.id, tab.href])).toEqual([
      [ProgramTab.Overview, base],
      [ProgramTab.Participants, `${base}/students`],
      [ProgramTab.Matching, `${base}/matching`],
      [ProgramTab.Appointments, `${base}/appointments`],
      [ProgramTab.Approvals, `${base}/approvals`],
      [ProgramTab.Settings, `${base}/settings`],
    ]);
    expect(participantTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ParticipantTab.Students,
      ParticipantTab.PeerMentors,
      ParticipantTab.IskurTeams,
      ParticipantTab.IskurChannels,
      ParticipantTab.Academics,
    ]);
    expect(studentsAreOfficeHours(detail)).toBe(false);
    expect(hasTabContent(detail, ProgramTab.Appointments)).toBe(true);
    expect(hasTabContent(detail, ProgramTab.Academics)).toBe(true);
    expect(misplacedTabHref(detail, "p1", ProgramTab.Appointments)).toBeNull();
    expect(misplacedTabHref(detail, "p1", ProgramTab.Teams)).toBe(
      `${base}/students`,
    );
  });

  it("drops İŞKUR's tabs without İŞKUR and sends their links to Öğrenciler", () => {
    const detail = semester([Peer]);
    expect(participantTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ParticipantTab.Students,
      ParticipantTab.PeerMentors,
    ]);
    expect(misplacedTabHref(detail, "p1", ProgramTab.IskurTeams)).toBe(
      `${base}/students`,
    );
    expect(misplacedTabHref(detail, "p1", ProgramTab.Appointments)).toBe(
      `${base}/matching`,
    );
    expect(hasTabContent(detail, ProgramTab.IskurTeams)).toBe(false);
  });

  it("gives a coordinator only the tabs of the features they hold", () => {
    const detail = semester([Peer, Oh, Iskur], [Oh]);
    expect(programTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ProgramTab.Overview,
      ProgramTab.Participants,
      ProgramTab.Appointments,
      ProgramTab.Settings,
    ]);
    expect(participantTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ParticipantTab.Academics,
      ParticipantTab.Students,
    ]);
    expect(studentsAreOfficeHours(detail)).toBe(true);
    expect(misplacedTabHref(detail, "p1", ProgramTab.PeerMentors)).toBe(
      `${base}/academics`,
    );
    expect(misplacedTabHref(detail, "p1", ProgramTab.Matching)).toBe(
      `${base}/appointments`,
    );
    expect(misplacedTabHref(detail, "p1", ProgramTab.Approvals)).toBe(base);
    expect(settingsSections(detail.program)).not.toContain(
      SettingsSection.Training,
    );
  });

  it("leaves a coordinator with no feature the shared tabs only", () => {
    const detail = semester([Peer, Oh], []);
    expect(programTabs(detail, "p1").map((tab) => tab.id)).toEqual([
      ProgramTab.Overview,
      ProgramTab.Settings,
    ]);
    expect(participantTabs(detail, "p1")).toEqual([]);
    expect(misplacedTabHref(detail, "p1", ProgramTab.Students)).toBe(base);
    expect(misplacedTabHref(detail, "p1", ProgramTab.Matching)).toBe(base);
    expect(misplacedTabHref(detail, "p1", ProgramTab.Reports)).toBeNull();
    expect(misplacedTabHref(detail, "p1", ProgramTab.Overview)).toBeNull();
  });

  it("lists Program özellikleri and the peer sections in a semester's settings", () => {
    const sections = settingsSections(semester([Peer, Iskur]).program);
    expect(sections).toContain(SettingsSection.Features);
    expect(sections).toContain(SettingsSection.Training);
    expect(sections).toContain(SettingsSection.PeerCategories);
    expect(
      settingsSections(semester([Oh], [Oh], ProgramLifecycle.Draft).program),
    ).toEqual(
      expect.not.arrayContaining([
        SettingsSection.Training,
        SettingsSection.Archive,
      ]),
    );
    expect(
      settingsSections({
        type: ProgramType.StartupMentoring,
        lifecycle: ProgramLifecycle.Active,
        features: [],
        myFeatures: [],
      }),
    ).not.toContain(SettingsSection.Features);
  });
});
