import "server-only";

import type {
  IskurTask,
  IskurTaskInput,
  IskurTaskUpdateInput,
  IskurTeamTasks,
} from "@/interfaces/iskur-tasks";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const taskUrl = (taskId: string) =>
  `/api/iskur/tasks/${encodeURIComponent(taskId)}`;

export function fetchIskurTeamTasks(actorId: string, weekStart: string | null) {
  return backendRequest<IskurTeamTasks>({
    method: HttpMethod.Get,
    url: "/api/iskur/team/tasks",
    params: weekStart ? { actorId, weekStart } : { actorId },
  });
}

export function createIskurTask(actorId: string, input: IskurTaskInput) {
  return backendRequest<IskurTeamTasks>({
    method: HttpMethod.Post,
    url: "/api/iskur/team/tasks",
    data: { ...input, actorId },
  });
}

export function fetchIskurTask(actorId: string, taskId: string) {
  return backendRequest<IskurTask>({
    method: HttpMethod.Get,
    url: taskUrl(taskId),
    params: { actorId },
  });
}

export function updateIskurTask(
  actorId: string,
  taskId: string,
  input: IskurTaskUpdateInput,
) {
  return backendRequest<IskurTask>({
    method: HttpMethod.Patch,
    url: taskUrl(taskId),
    data: { ...input, actorId },
  });
}

export function deleteIskurTask(actorId: string, taskId: string) {
  return backendRequest<IskurTeamTasks>({
    method: HttpMethod.Delete,
    url: taskUrl(taskId),
    params: { actorId },
  });
}
