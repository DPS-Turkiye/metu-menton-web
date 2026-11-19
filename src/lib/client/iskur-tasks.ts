import type {
  IskurTask,
  IskurTaskInput,
  IskurTaskUpdateInput,
  IskurTeamTasks,
} from "@/interfaces/iskur-tasks";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const taskUrl = (taskId: string) =>
  `/api/iskur/tasks/${encodeURIComponent(taskId)}`;

export async function getIskurTeamTasks(weekStart: string | null) {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  return requireSuccess(
    await httpClient.get<IskurTeamTasks>(`/api/iskur/team/tasks${query}`),
  );
}

export async function createIskurTask(input: IskurTaskInput) {
  return requireSuccess(
    await httpClient.post<IskurTeamTasks>("/api/iskur/team/tasks", input),
  );
}

export async function getIskurTask(taskId: string) {
  return requireSuccess(await httpClient.get<IskurTask>(taskUrl(taskId)));
}

export async function updateIskurTask(
  taskId: string,
  input: IskurTaskUpdateInput,
) {
  return requireSuccess(
    await httpClient.patch<IskurTask>(taskUrl(taskId), input),
  );
}

export async function deleteIskurTask(taskId: string) {
  return requireSuccess(
    await httpClient.delete<IskurTeamTasks>(taskUrl(taskId)),
  );
}
