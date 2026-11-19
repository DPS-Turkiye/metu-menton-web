import type {
  IskurApplications,
  IskurDocumentSlot,
  IskurOnboarding,
  IskurOnboardingInput,
  IskurTeamReveal,
} from "@/interfaces/iskur-onboarding";
import { requireSuccess } from "@/lib/client/api";
import { httpClient, UPLOAD_TIMEOUT_MS } from "@/lib/http-client";

const ONBOARDING = "/api/iskur/onboarding";

const coordinatorBase = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur`;

export async function getIskurOnboarding() {
  return requireSuccess(await httpClient.get<IskurOnboarding>(ONBOARDING));
}

export async function saveIskurOnboardingDraft(input: IskurOnboardingInput) {
  return requireSuccess(
    await httpClient.put<IskurOnboarding>(ONBOARDING, input),
  );
}

export async function submitIskurOnboarding(input: IskurOnboardingInput) {
  return requireSuccess(
    await httpClient.post<IskurOnboarding>(`${ONBOARDING}/submit`, input),
  );
}

/** Through this app's route, which checks the file before it reaches the backend; ODTÜ has no edge body limit. */
export async function uploadIskurOnboardingDocument(
  slot: IskurDocumentSlot,
  file: File,
) {
  const data = new FormData();
  data.set("file", file);
  return requireSuccess(
    await httpClient.post<IskurOnboarding>(
      `${ONBOARDING}/documents/${encodeURIComponent(slot)}`,
      data,
      { timeout: UPLOAD_TIMEOUT_MS },
    ),
  );
}

export async function removeIskurOnboardingDocument(slot: IskurDocumentSlot) {
  return requireSuccess(
    await httpClient.delete<IskurOnboarding>(
      `${ONBOARDING}/documents/${encodeURIComponent(slot)}`,
    ),
  );
}

export async function getIskurTeamReveal() {
  return requireSuccess(await httpClient.get<IskurTeamReveal>("/api/iskur/me"));
}

export async function getIskurApplications(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurApplications>(
      `${coordinatorBase(programId)}/applications`,
    ),
  );
}

/** Where the browser opens an intern's CV or transcript; the route streams it as an attachment. */
export function iskurApplicationDocumentHref(
  programId: string,
  userId: string,
  slot: IskurDocumentSlot,
) {
  return `${coordinatorBase(programId)}/applications/${encodeURIComponent(userId)}/documents/${encodeURIComponent(slot)}`;
}

export async function replaceIskurUnitSkills(
  programId: string,
  unitId: string,
  names: string[],
) {
  return requireSuccess(
    await httpClient.put<IskurApplications>(
      `${coordinatorBase(programId)}/units/${encodeURIComponent(unitId)}/skills`,
      { names },
    ),
  );
}
