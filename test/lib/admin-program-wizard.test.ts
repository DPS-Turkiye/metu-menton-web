import { describe, expect, it } from "vitest";

import type { AdminOverview, AdminUser } from "@/interfaces/admin-overview";
import {
  ProgramFeature,
  ProgramStatus,
  ProgramType,
} from "@/interfaces/program";
import { UserAccountStatus, UserRole } from "@/interfaces/session";
import {
  BUSY_COORDINATOR_PROGRAMS,
  coordinatorLoads,
  createProgramInput,
  emptyWizardDraft,
  matchesCoordinatorQuery,
  stepProblem,
  toggleCoordinator,
  WizardProblem,
  WizardStep,
} from "@/lib/admin-program-wizard";
import {
  CoordinatorChoiceKind,
  existingChoice,
  invitedChoice,
} from "@/lib/coordinator-picker";
import { adminProgram } from "@test/fixtures/admin-programs";

describe("admin program wizard", () => {
  it("chooses the type up front only when the edition offers a single one", () => {
    expect(emptyWizardDraft([ProgramType.StartupMentoring]).type).toBe(
      ProgramType.StartupMentoring,
    );
    expect(
      emptyWizardDraft([ProgramType.PeerMentoring, ProgramType.OfficeHours])
        .type,
    ).toBeNull();
    expect(emptyWizardDraft([]).type).toBeNull();
  });

  it("asks for a type, a name, dates in order and a coordinator", () => {
    const draft = emptyWizardDraft([
      ProgramType.PeerMentoring,
      ProgramType.OfficeHours,
    ]);
    expect(stepProblem(WizardStep.Type, draft)).toBe(
      WizardProblem.TypeRequired,
    );
    expect(stepProblem(WizardStep.Info, { ...draft, name: "  " })).toBe(
      WizardProblem.NameRequired,
    );
    expect(
      stepProblem(WizardStep.Info, {
        ...draft,
        name: "Akran",
        startDate: "2026-12-01",
        endDate: "2026-11-01",
      }),
    ).toBe(WizardProblem.DatesOrder);
    expect(
      stepProblem(WizardStep.Info, { ...draft, name: "Akran" }),
    ).toBeNull();
    expect(stepProblem(WizardStep.Coordinators, draft)).toBe(
      WizardProblem.CoordinatorRequired,
    );
    expect(
      stepProblem(WizardStep.Coordinators, {
        ...draft,
        coordinators: [
          {
            kind: CoordinatorChoiceKind.Invited,
            fullName: "Yeni",
            email: "yeni@x.org",
          },
        ],
      }),
    ).toBeNull();
    expect(stepProblem(WizardStep.Summary, draft)).toBeNull();
  });

  it("starts a semester with every feature and asks it for at least one", () => {
    const draft = emptyWizardDraft([ProgramType.Semester]);
    expect(draft.type).toBe(ProgramType.Semester);
    expect(draft.features).toEqual([
      ProgramFeature.PeerMentoring,
      ProgramFeature.OfficeHours,
      ProgramFeature.Iskur,
    ]);
    expect(stepProblem(WizardStep.Type, draft)).toBeNull();
    expect(stepProblem(WizardStep.Type, { ...draft, features: [] })).toBe(
      WizardProblem.FeaturesRequired,
    );
    expect(
      stepProblem(WizardStep.Type, {
        ...draft,
        features: [ProgramFeature.Iskur],
      }),
    ).toBe(WizardProblem.IskurNeedsPeer);
    expect(
      stepProblem(WizardStep.Type, {
        ...emptyWizardDraft([ProgramType.StartupMentoring]),
        features: [],
      }),
    ).toBeNull();
  });

  it("sends a semester's features and leaves them out for any other type", () => {
    const draft = {
      ...emptyWizardDraft([ProgramType.Semester]),
      name: "2026 Güz",
      features: [ProgramFeature.OfficeHours],
    };
    expect(createProgramInput(draft, ProgramType.Semester)).toEqual({
      type: ProgramType.Semester,
      features: [ProgramFeature.OfficeHours],
      name: "2026 Güz",
      description: null,
      startDate: null,
      endDate: null,
      coordinatorIds: [],
      newCoordinators: [],
    });
    expect(
      createProgramInput(draft, ProgramType.StartupMentoring),
    ).not.toHaveProperty("features");
  });

  it("sends the type, trimmed details, no empty dates and the coordinators", () => {
    expect(
      createProgramInput(
        {
          ...emptyWizardDraft([
            ProgramType.PeerMentoring,
            ProgramType.OfficeHours,
          ]),
          name: "  ODTÜ Akran 2027 ",
          description: " ",
          coordinators: [
            existingChoice({
              id: "c1",
              fullName: "Ayşe Aydın",
              email: "ayse@teknokent.org",
            }),
            invitedChoice(" Yeni@Teknokent.org ", " Yeni Kişi "),
          ],
        },
        ProgramType.PeerMentoring,
      ),
    ).toEqual({
      type: ProgramType.PeerMentoring,
      name: "ODTÜ Akran 2027",
      description: null,
      startDate: null,
      endDate: null,
      coordinatorIds: ["c1"],
      newCoordinators: [{ fullName: "Yeni Kişi", email: "yeni@teknokent.org" }],
    });
  });
});

function person(
  id: string,
  fullName: string,
  overrides: Partial<AdminUser> = {},
): AdminUser {
  return {
    id,
    email: `${id}@metu.test`,
    fullName,
    role: UserRole.Coordinator,
    status: UserAccountStatus.Approved,
    organizationId: null,
    organizationName: null,
    jobTitle: null,
    ...overrides,
  };
}

describe("the ODTÜ wizard's coordinators", () => {
  const overview: AdminOverview = {
    programs: [
      adminProgram({ id: "a", name: "Akran", coordinatorIds: ["ilk"] }),
      adminProgram({
        id: "b",
        name: "Taslak",
        status: ProgramStatus.Draft,
        coordinatorIds: ["ilk"],
      }),
      adminProgram({ id: "c", name: "OH", coordinatorIds: ["ilk"] }),
      adminProgram({
        id: "d",
        name: "Biten",
        status: ProgramStatus.Completed,
        coordinatorIds: ["ikinci"],
      }),
    ],
    users: [
      person("ikinci", "Şule İnce"),
      person("ilk", "Çağrı Ak"),
      person("mentor", "Mentor Kişi", { role: UserRole.Mentor }),
      person("red", "Reddedilen", { status: UserAccountStatus.Rejected }),
    ],
    mentorships: [],
    requests: [],
    bottlenecks: [],
    meetingsLast8Weeks: 0,
  };

  it("lists approved coordinators in Turkish order with the programs they run now", () => {
    expect(coordinatorLoads(overview)).toEqual([
      {
        id: "ilk",
        fullName: "Çağrı Ak",
        email: "ilk@metu.test",
        programs: ["Akran", "Taslak", "OH"],
        busy: true,
      },
      {
        id: "ikinci",
        fullName: "Şule İnce",
        email: "ikinci@metu.test",
        programs: [],
        busy: false,
      },
    ]);
    expect(BUSY_COORDINATOR_PROGRAMS).toBe(3);
  });

  it("finds a coordinator by name or e-mail, Turkish case-insensitive", () => {
    const [cagri, sule] = coordinatorLoads(overview);
    if (!cagri || !sule) throw new Error("missing loads");
    expect(matchesCoordinatorQuery(sule, "İNCE")).toBe(true);
    expect(matchesCoordinatorQuery(cagri, "ilk@")).toBe(true);
    expect(matchesCoordinatorQuery(cagri, "şule")).toBe(false);
    expect(matchesCoordinatorQuery(cagri, "  ")).toBe(true);
    expect(matchesCoordinatorQuery(cagri, "CAĞRI")).toBe(false);
    expect(matchesCoordinatorQuery(sule, "ince")).toBe(true);
    expect(matchesCoordinatorQuery(cagri, "ILK@")).toBe(true);
  });

  it("picks and unpicks a coordinator, keeping the others", () => {
    const [cagri, sule] = coordinatorLoads(overview);
    if (!cagri || !sule) throw new Error("missing loads");
    const invited = invitedChoice("yeni@metu.test", "Yeni Kişi");
    const picked = toggleCoordinator([invited], cagri);
    expect(picked).toEqual([
      invited,
      {
        kind: CoordinatorChoiceKind.Existing,
        id: "ilk",
        fullName: "Çağrı Ak",
        email: "ilk@metu.test",
      },
    ]);
    expect(toggleCoordinator(picked, cagri)).toEqual([invited]);
  });
});
