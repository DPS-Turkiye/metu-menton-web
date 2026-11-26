import type { AdminOverview } from "@/interfaces/admin-overview";
import type { CreateProgramInput } from "@/interfaces/coordinator-program";
import {
  ProgramStatus,
  ProgramType,
  type ProgramFeature,
} from "@/interfaces/program";
import { UserAccountStatus } from "@/interfaces/session";
import { coordinatorsOf } from "@/lib/admin-model";
import {
  addChoice,
  choiceKey,
  CoordinatorChoiceKind,
  removeChoice,
  splitChoices,
  type CoordinatorChoice,
} from "@/lib/coordinator-picker";
import {
  FeatureSetProblem,
  featureSetProblem,
  PROGRAM_FEATURES,
} from "@/lib/program-features";

export enum WizardStep {
  Type = "TYPE",
  Info = "INFO",
  Coordinators = "COORDINATORS",
  Summary = "SUMMARY",
}

export const WIZARD_STEPS = Object.values(WizardStep);

export enum WizardProblem {
  TypeRequired = "TYPE_REQUIRED",
  NameRequired = "NAME_REQUIRED",
  DatesOrder = "DATES_ORDER",
  CoordinatorRequired = "COORDINATOR_REQUIRED",
  FeaturesRequired = "FEATURES_REQUIRED",
  IskurNeedsPeer = "ISKUR_NEEDS_PEER",
}

export type ProgramWizardDraft = {
  type: ProgramType | null;
  /** A semester's features; every one is on until the admin switches some off. */
  features: ProgramFeature[];
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  coordinators: CoordinatorChoice[];
};

/** A new draft; when the edition offers a single program type, it is already chosen. */
export function emptyWizardDraft(
  programTypes: readonly ProgramType[],
): ProgramWizardDraft {
  return {
    type: programTypes.length === 1 ? (programTypes[0] ?? null) : null,
    features: [...PROGRAM_FEATURES],
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    coordinators: [],
  };
}

const FEATURE_PROBLEMS: Record<FeatureSetProblem, WizardProblem> = {
  [FeatureSetProblem.Empty]: WizardProblem.FeaturesRequired,
  [FeatureSetProblem.IskurNeedsPeer]: WizardProblem.IskurNeedsPeer,
};

/**
 * What stops the admin from leaving a step; dates are optional but must be in order. A semester's first step is its
 * features rather than a type.
 */
export function stepProblem(
  step: WizardStep,
  draft: ProgramWizardDraft,
): WizardProblem | null {
  if (step === WizardStep.Type && !draft.type) {
    return WizardProblem.TypeRequired;
  }
  if (step === WizardStep.Type && draft.type === ProgramType.Semester) {
    const problem = featureSetProblem(draft.features);
    if (problem) return FEATURE_PROBLEMS[problem];
  }
  if (step === WizardStep.Info) {
    if (!draft.name.trim()) return WizardProblem.NameRequired;
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      return WizardProblem.DatesOrder;
    }
  }
  if (step === WizardStep.Coordinators && draft.coordinators.length === 0) {
    return WizardProblem.CoordinatorRequired;
  }
  return null;
}

export function createProgramInput(
  draft: ProgramWizardDraft,
  type: ProgramType,
): CreateProgramInput {
  return {
    type,
    ...(type === ProgramType.Semester ? { features: draft.features } : {}),
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    startDate: draft.startDate || null,
    endDate: draft.endDate || null,
    ...splitChoices(draft.coordinators),
  };
}

/**
 * A coordinator with this many programs still running or being set up reads as "Yoğun" in the ODTÜ wizard. An
 * assumption until the product sets a capacity: three programs at once is where the round drew the line.
 */
export const BUSY_COORDINATOR_PROGRAMS = 3;

/** The ODTÜ wizard caps the short description the frame counts down; the backend allows more. */
export const PROGRAM_DESCRIPTION_MAX = 500;

/** An approved coordinator with the programs they run now (completed ones left out), for the wizard's list. */
export type CoordinatorLoad = {
  id: string;
  fullName: string;
  email: string;
  programs: string[];
  busy: boolean;
};

/** Every approved coordinator, by name, with the active and draft programs they coordinate. */
export function coordinatorLoads(overview: AdminOverview): CoordinatorLoad[] {
  return coordinatorsOf(overview)
    .filter((user) => user.status === UserAccountStatus.Approved)
    .map((user) => {
      const programs = overview.programs
        .filter(
          (program) =>
            program.status !== ProgramStatus.Completed &&
            (program.coordinatorIds ?? []).includes(user.id),
        )
        .map((program) => program.name);
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        programs,
        busy: programs.length >= BUSY_COORDINATOR_PROGRAMS,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
}

/** Turkish lower case with dotless ı read as i, so "Irmak", "ırmak" and "İrmak" all meet. */
function searchFold(value: string) {
  return value.toLocaleLowerCase("tr").replace(/ı/g, "i");
}

/** Name or e-mail contains the query, Turkish case-insensitive; an empty query keeps everyone. */
export function matchesCoordinatorQuery(load: CoordinatorLoad, query: string) {
  const wanted = searchFold(query.trim());
  return (
    searchFold(load.fullName).includes(wanted) ||
    searchFold(load.email).includes(wanted)
  );
}

/** The wizard's pick for a listed coordinator: an existing account. */
export function loadChoice(load: CoordinatorLoad): CoordinatorChoice {
  return {
    kind: CoordinatorChoiceKind.Existing,
    id: load.id,
    fullName: load.fullName,
    email: load.email,
  };
}

/** Picks or unpicks a listed coordinator; an existing pick's key is its account id. */
export function toggleCoordinator(
  chosen: readonly CoordinatorChoice[],
  load: CoordinatorLoad,
): CoordinatorChoice[] {
  return chosen.some((choice) => choiceKey(choice) === load.id)
    ? removeChoice(chosen, load.id)
    : addChoice(chosen, loadChoice(load));
}
