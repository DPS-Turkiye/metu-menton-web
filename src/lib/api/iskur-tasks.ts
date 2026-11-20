import "server-only";

import type {
  IskurTask,
  IskurTaskInput,
  IskurTaskOutputs,
  IskurTaskUpdateInput,
  IskurTeamTasks,
} from "@/interfaces/iskur-tasks";
import { UPLOAD_TIMEOUT_MS } from "@/lib/http-client";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const taskUrl = (taskId: string) =>
  `/api/iskur/tasks/${encodeURIComponent(taskId)}`;

const outputUrl = (taskId: string, outputId: string) =>
  `${taskUrl(taskId)}/outputs/${encodeURIComponent(outputId)}`;

const programOutputsUrl = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/task-outputs`;

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

/** The form carries only the checked file; the backend reads its format from the bytes and files it under the actor. */
export function uploadIskurTaskOutput(
  actorId: string,
  taskId: string,
  form: FormData,
) {
  return backendRequest<IskurTask>({
    method: HttpMethod.Post,
    url: `${taskUrl(taskId)}/outputs`,
    params: { actorId },
    data: form,
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

export function removeIskurTaskOutput(
  actorId: string,
  taskId: string,
  outputId: string,
) {
  return backendRequest<IskurTask>({
    method: HttpMethod.Delete,
    url: outputUrl(taskId, outputId),
    params: { actorId },
  });
}

/** The file's bytes, for the task's assignee and its team's leaders; the backend checks who asks every time. */
export function fetchIskurTaskOutputContent(
  actorId: string,
  taskId: string,
  outputId: string,
) {
  return backendRequest<ArrayBuffer>({
    method: HttpMethod.Get,
    url: outputUrl(taskId, outputId),
    params: { actorId },
    responseType: "arraybuffer",
    headers: { Accept: "*/*" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

export function fetchIskurTaskOutputs(actorId: string, programId: string) {
  return backendRequest<IskurTaskOutputs>({
    method: HttpMethod.Get,
    url: programOutputsUrl(programId),
    params: { actorId },
  });
}

export function fetchIskurProgramTaskOutputContent(
  actorId: string,
  programId: string,
  taskId: string,
  outputId: string,
) {
  return backendRequest<ArrayBuffer>({
    method: HttpMethod.Get,
    url: `${programOutputsUrl(programId)}/${encodeURIComponent(taskId)}/${encodeURIComponent(outputId)}`,
    params: { actorId },
    responseType: "arraybuffer",
    headers: { Accept: "*/*" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
}
