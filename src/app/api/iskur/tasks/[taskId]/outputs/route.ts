import type { NextRequest } from "next/server";

import { uploadIskurTaskOutput } from "@/lib/api/iskur-tasks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readIskurDocumentUpload } from "@/lib/server/iskur-document-upload";
import { readUuidParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ taskId: string }> };

/** The assignee hands in a file with their task; the backend decides whether they may and what the file is. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const task = await readUuidParam((await params).taskId, "iskurTaskInvalid");
    if (!task.ok) return task.response;
    const upload = await readIskurDocumentUpload(
      request,
      "iskurTaskOutputInvalid",
    );
    if (!upload.ok) return upload.response;
    return backendResponse(
      await uploadIskurTaskOutput(session.userId, task.id, upload.form),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTaskOutputUploadFailed"),
    });
  }
}
