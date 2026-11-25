import {
  deleteIskurTask,
  editIskurTask,
  fetchIskurTask,
  updateIskurTask,
} from "@/lib/api/iskur-tasks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import {
  iskurTaskSchema,
  iskurTaskUpdateSchema,
} from "@/lib/server/iskur-task-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const task = await readUuidParam((await params).taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    return backendResponse(await fetchIskurTask(session.userId, task.id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTasksLoadFailed"),
    });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const task = await readUuidParam((await params).taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    const body = await readJsonBody(request, iskurTaskUpdateSchema, {
      invalidMessage: "iskurTaskInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await updateIskurTask(session.userId, task.id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTaskSaveFailed"),
    });
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const task = await readUuidParam((await params).taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    const body = await readJsonBody(request, iskurTaskSchema, {
      invalidMessage: "iskurTaskInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await editIskurTask(session.userId, task.id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTaskSaveFailed"),
    });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const task = await readUuidParam((await params).taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    return backendResponse(await deleteIskurTask(session.userId, task.id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTaskSaveFailed"),
    });
  }
}
