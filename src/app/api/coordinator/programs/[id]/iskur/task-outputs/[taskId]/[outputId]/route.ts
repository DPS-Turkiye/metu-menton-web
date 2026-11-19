import { NextResponse } from "next/server";

import { fetchIskurProgramTaskOutputContent } from "@/lib/api/iskur-tasks";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import { attachmentResponse } from "@/lib/server/attachment-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = {
  params: Promise<{ id: string; taskId: string; outputId: string }>;
};

/** A file handed in with one of the program's tasks, for its coordinators; the backend checks the caller each time. */
export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, taskId, outputId } = await params;
    const program = await readUuidParam(id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const task = await readUuidParam(taskId, "invalidRequestFields");
    if (!task.ok) return task.response;
    const output = await readUuidParam(outputId, "invalidRequestFields");
    if (!output.ok) return output.response;
    const file = await fetchIskurProgramTaskOutputContent(
      auth.session.userId,
      program.id,
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
