import type {
  IskurTask,
  IskurTaskInput,
  IskurTaskOutputs,
  IskurTaskUpdateInput,
  IskurTeamTasks,
} from "@/interfaces/iskur-tasks";
import { requireSuccess } from "@/lib/client/api";
import { httpClient, UPLOAD_TIMEOUT_MS } from "@/lib/http-client";

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

export async function editIskurTask(taskId: string, input: IskurTaskInput) {
  return requireSuccess(
    await httpClient.put<IskurTeamTasks>(taskUrl(taskId), input),
  );
}

export async function deleteIskurTask(taskId: string) {
  return requireSuccess(
    await httpClient.delete<IskurTeamTasks>(taskUrl(taskId)),
  );
}

/** Through this app's route, which checks the file's size before it reaches the backend. */
export async function uploadIskurTaskOutput(taskId: string, file: File) {
  const data = new FormData();
  data.set("file", file);
  return requireSuccess(
    await httpClient.post<IskurTask>(`${taskUrl(taskId)}/outputs`, data, {
      timeout: UPLOAD_TIMEOUT_MS,
    }),
  );
}

export async function removeIskurTaskOutput(taskId: string, outputId: string) {
  return requireSuccess(
    await httpClient.delete<IskurTask>(iskurTaskOutputHref(taskId, outputId)),
  );
}

/** Where the browser downloads a handed-in file; the route streams it as an attachment after the backend's check. */
export function iskurTaskOutputHref(taskId: string, outputId: string) {
  return `${taskUrl(taskId)}/outputs/${encodeURIComponent(outputId)}`;
}

const programOutputsUrl = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/task-outputs`;

export async function getIskurTaskOutputs(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurTaskOutputs>(programOutputsUrl(programId)),
  );
}

/** The coordinator's download of a handed-in file of their program. */
export function iskurProgramTaskOutputHref(
  programId: string,
  taskId: string,
  outputId: string,
) {
  return `${programOutputsUrl(programId)}/${encodeURIComponent(taskId)}/${encodeURIComponent(outputId)}`;
}
