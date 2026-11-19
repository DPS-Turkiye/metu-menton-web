import type {
  IskurLeaderQueue,
  IskurLeaderWeek,
  IskurSupportEntryInput,
  IskurWeek,
  IskurWeekDecisionInput,
  IskurWorkEntryInput,
} from "@/interfaces/iskur-weeks";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const week = (weekStart: string) =>
  `/api/iskur/week/${encodeURIComponent(weekStart)}`;
const query = (weekStart: string | null) =>
  weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
const fallback = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/weeks`;

export async function getIskurWeek(weekStart: string | null) {
  return requireSuccess(
    await httpClient.get<IskurWeek>(`/api/iskur/week${query(weekStart)}`),
  );
}

export async function saveIskurWeekEntries(
  weekStart: string,
  entries: IskurWorkEntryInput[],
) {
  return requireSuccess(
    await httpClient.put<IskurWeek>(`${week(weekStart)}/entries`, { entries }),
  );
}

export async function addIskurSupportEntry(
  weekStart: string,
  input: IskurSupportEntryInput,
) {
  return requireSuccess(
    await httpClient.post<IskurWeek>(
      `${week(weekStart)}/support-activity`,
      input,
    ),
  );
}

export async function submitIskurWeek(weekStart: string) {
  return requireSuccess(
    await httpClient.post<IskurWeek>(`${week(weekStart)}/submit`),
  );
}

export async function objectToIskurWeek(weekStart: string, objection: string) {
  return requireSuccess(
    await httpClient.post<IskurWeek>(`${week(weekStart)}/objection`, {
      objection,
    }),
  );
}

export async function getIskurLeaderQueue(weekStart: string | null) {
  return requireSuccess(
    await httpClient.get<IskurLeaderQueue>(
      `/api/iskur/leader/weeks${query(weekStart)}`,
    ),
  );
}

export async function getIskurLeaderWeek(weekId: string) {
  return requireSuccess(
    await httpClient.get<IskurLeaderWeek>(
      `/api/iskur/leader/weeks/${encodeURIComponent(weekId)}`,
    ),
  );
}

export async function decideIskurLeaderWeek(
  weekId: string,
  input: IskurWeekDecisionInput,
) {
  return requireSuccess(
    await httpClient.post<IskurLeaderWeek>(
      `/api/iskur/leader/weeks/${encodeURIComponent(weekId)}/decision`,
      input,
    ),
  );
}

export async function getIskurFallbackQueue(
  programId: string,
  weekStart: string | null,
) {
  return requireSuccess(
    await httpClient.get<IskurLeaderQueue>(
      `${fallback(programId)}${query(weekStart)}`,
    ),
  );
}

export async function getIskurFallbackWeek(programId: string, weekId: string) {
  return requireSuccess(
    await httpClient.get<IskurLeaderWeek>(
      `${fallback(programId)}/${encodeURIComponent(weekId)}`,
    ),
  );
}

export async function decideIskurFallbackWeek(
  programId: string,
  weekId: string,
  input: IskurWeekDecisionInput,
) {
  return requireSuccess(
    await httpClient.post<IskurLeaderWeek>(
      `${fallback(programId)}/${encodeURIComponent(weekId)}/decision`,
      input,
    ),
  );
}
