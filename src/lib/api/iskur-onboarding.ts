import "server-only";

import type {
  IskurApplications,
  IskurDocumentSlot,
  IskurOnboarding,
  IskurOnboardingInput,
  IskurTeamReveal,
} from "@/interfaces/iskur-onboarding";
import { UPLOAD_TIMEOUT_MS } from "@/lib/http-client";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const ONBOARDING = "/api/iskur/onboarding";

const coordinatorBase = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur`;

export function fetchIskurOnboarding(actorId: string) {
  return backendRequest<IskurOnboarding>({
    method: HttpMethod.Get,
    url: ONBOARDING,
    params: { actorId },
  });
}

export function saveIskurOnboardingDraft(
  actorId: string,
  input: IskurOnboardingInput,
) {
  return backendRequest<IskurOnboarding>({
    method: HttpMethod.Put,
    url: ONBOARDING,
    data: { ...input, actorId },
  });
}

export function submitIskurOnboarding(
  actorId: string,
  input: IskurOnboardingInput,
) {
  return backendRequest<IskurOnboarding>({
    method: HttpMethod.Post,
    url: `${ONBOARDING}/submit`,
    data: { ...input, actorId },
  });
}

/** The form carries only the checked PDF; the backend files it under the actor. */
export function uploadIskurOnboardingDocument(
  actorId: string,
  slot: IskurDocumentSlot,
  form: FormData,
) {
  return backendRequest<IskurOnboarding>({
    method: HttpMethod.Post,
    url: `${ONBOARDING}/documents/${encodeURIComponent(slot)}`,
    params: { actorId },
    data: form,
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

export function removeIskurOnboardingDocument(
  actorId: string,
  slot: IskurDocumentSlot,
) {
  return backendRequest<IskurOnboarding>({
    method: HttpMethod.Delete,
    url: `${ONBOARDING}/documents/${encodeURIComponent(slot)}`,
    params: { actorId },
  });
}

export function fetchIskurTeamReveal(actorId: string) {
  return backendRequest<IskurTeamReveal>({
    method: HttpMethod.Get,
    url: "/api/iskur/me",
    params: { actorId },
  });
}

export function fetchIskurApplications(actorId: string, programId: string) {
  return backendRequest<IskurApplications>({
    method: HttpMethod.Get,
    url: `${coordinatorBase(programId)}/applications`,
    params: { actorId },
  });
}

export function fetchIskurApplicationDocument(
  actorId: string,
  programId: string,
  userId: string,
  slot: IskurDocumentSlot,
) {
  return backendRequest<ArrayBuffer>({
    method: HttpMethod.Get,
    url: `${coordinatorBase(programId)}/applications/${encodeURIComponent(userId)}/documents/${encodeURIComponent(slot)}`,
    params: { actorId },
    responseType: "arraybuffer",
    headers: { Accept: "*/*" },
  });
}

export function replaceIskurUnitSkills(
  actorId: string,
  programId: string,
  unitId: string,
  names: string[],
) {
  return backendRequest<IskurApplications>({
    method: HttpMethod.Put,
    url: `${coordinatorBase(programId)}/units/${encodeURIComponent(unitId)}/skills`,
    data: { actorId, names },
  });
}
