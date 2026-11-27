import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  deleteProgramMembership,
  fetchProgramMembership,
  putProgramMembership,
} from "@/lib/api/admin-membership";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readBearerToken } from "@/lib/server/bearer-token";
import { readJsonBody } from "@/lib/server/request-body";
import { requireAdminSession } from "@/lib/server/require-admin";
import { SessionRequiredError } from "@/lib/server/session-error";

type RouteContext = { params: Promise<{ id: string }> };

const moveSchema = z.object({ programId: z.uuid() });

/** The student's semester, where they may go, and what keeps them where they are. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    return backendResponse(
      await fetchProgramMembership(auth.session.userId, id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("programMembershipLoadFailed"),
    });
  }
}

/** "Programa ekle" (a move when the student is in another semester); only with the admin's own sign-in. */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    const idToken = readBearerToken(request);
    if (!idToken) throw new SessionRequiredError();
    const { id } = await context.params;
    const body = await readJsonBody(request, moveSchema);
    if (!body.ok) return body.response;
    return backendResponse(
      await putProgramMembership(id, body.data.programId, idToken),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("programMembershipSaveFailed"),
    });
  }
}

/** "Programdan çıkar"; only with the admin's own sign-in. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    const idToken = readBearerToken(request);
    if (!idToken) throw new SessionRequiredError();
    const { id } = await context.params;
    return backendResponse(await deleteProgramMembership(id, idToken));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("programMembershipSaveFailed"),
    });
  }
}
