import "server-only";

import type {
  IskurLeaderQueue,
  IskurLeaderWeek,
  IskurSupportEntryInput,
  IskurWeek,
  IskurWeekDecisionInput,
  IskurWorkEntryInput,
} from "@/interfaces/iskur-weeks";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const week = (weekStart: string) =>
  `/api/iskur/week/${encodeURIComponent(weekStart)}`;
const leaderWeek = (weekId: string) =>
  `/api/iskur/leader/weeks/${encodeURIComponent(weekId)}`;
const fallback = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/weeks`;

export function fetchIskurWeek(actorId: string, weekStart: string | null) {
  return backendRequest<IskurWeek>({
    method: HttpMethod.Get,
    url: "/api/iskur/week",
    params: weekStart ? { actorId, weekStart } : { actorId },
  });
}

export function saveIskurWeekEntries(
  actorId: string,
  weekStart: string,
  entries: IskurWorkEntryInput[],
) {
  return backendRequest<IskurWeek>({
    method: HttpMethod.Put,
    url: `${week(weekStart)}/entries`,
    data: { entries, actorId },
  });
}

export function addIskurSupportEntry(
  actorId: string,
  weekStart: string,
  input: IskurSupportEntryInput,
) {
  return backendRequest<IskurWeek>({
    method: HttpMethod.Post,
    url: `${week(weekStart)}/support-activity`,
    data: { ...input, actorId },
  });
}

export function submitIskurWeek(actorId: string, weekStart: string) {
  return backendRequest<IskurWeek>({
    method: HttpMethod.Post,
    url: `${week(weekStart)}/submit`,
    data: { actorId },
  });
}

export function objectToIskurWeek(
  actorId: string,
  weekStart: string,
  objection: string,
) {
  return backendRequest<IskurWeek>({
    method: HttpMethod.Post,
    url: `${week(weekStart)}/objection`,
    data: { objection, actorId },
  });
}

export function fetchIskurLeaderQueue(
  actorId: string,
  weekStart: string | null,
) {
  return backendRequest<IskurLeaderQueue>({
    method: HttpMethod.Get,
    url: "/api/iskur/leader/weeks",
    params: weekStart ? { actorId, weekStart } : { actorId },
  });
}

export function fetchIskurLeaderWeek(actorId: string, weekId: string) {
  return backendRequest<IskurLeaderWeek>({
    method: HttpMethod.Get,
    url: leaderWeek(weekId),
    params: { actorId },
  });
}

export function decideIskurLeaderWeek(
  actorId: string,
  weekId: string,
  input: IskurWeekDecisionInput,
) {
  return backendRequest<IskurLeaderWeek>({
    method: HttpMethod.Post,
    url: `${leaderWeek(weekId)}/decision`,
    data: { ...input, actorId },
  });
}

export function fetchIskurFallbackQueue(
  actorId: string,
  programId: string,
  weekStart: string | null,
) {
  return backendRequest<IskurLeaderQueue>({
    method: HttpMethod.Get,
    url: fallback(programId),
    params: weekStart ? { actorId, weekStart } : { actorId },
  });
}

export function fetchIskurFallbackWeek(
  actorId: string,
  programId: string,
  weekId: string,
) {
  return backendRequest<IskurLeaderWeek>({
    method: HttpMethod.Get,
    url: `${fallback(programId)}/${encodeURIComponent(weekId)}`,
    params: { actorId },
  });
}

export function decideIskurFallbackWeek(
  actorId: string,
  programId: string,
  weekId: string,
  input: IskurWeekDecisionInput,
) {
  return backendRequest<IskurLeaderWeek>({
    method: HttpMethod.Post,
    url: `${fallback(programId)}/${encodeURIComponent(weekId)}/decision`,
    data: { ...input, actorId },
  });
}
