import { NextResponse } from "next/server";

import {
  fetchIskurTaskOutputContent,
  removeIskurTaskOutput,
} from "@/lib/api/iskur-tasks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { attachmentResponse } from "@/lib/server/attachment-response";
import { readUuidParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ taskId: string; outputId: string }> };

/**
 * A file handed in with a task, for its assignee and its team's leaders. The backend checks the caller on every
 * request; there is no public or signed address for it.
 */
export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const { taskId, outputId } = await params;
    const task = await readUuidParam(taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    const output = await readUuidParam(outputId, "iskurTaskInvalid");
    if (!output.ok) return output.response;
    const file = await fetchIskurTaskOutputContent(
      session.userId,
      task.id,
      output.id,
    );
    if (file.status !== 200) {
      return NextResponse.json(
        { message: await apiText("fileOpenFailed") },
        { status: file.status },
      );
    }
    return attachmentResponse(file, "output");
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("fileOpenFailed"),
    });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const { taskId, outputId } = await params;
    const task = await readUuidParam(taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    const output = await readUuidParam(outputId, "iskurTaskInvalid");
    if (!output.ok) return output.response;
    return backendResponse(
      await removeIskurTaskOutput(session.userId, task.id, output.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTaskOutputRemoveFailed"),
    });
  }
}
