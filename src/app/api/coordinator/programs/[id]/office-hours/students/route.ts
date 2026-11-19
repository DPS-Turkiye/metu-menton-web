import type { NextRequest } from "next/server";

import { fetchProgramOfficeHoursStudents } from "@/lib/api/program-office-hours";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { programOfficeHoursStudentsQuerySchema } from "@/lib/server/program-office-hours-schemas";
import { readSearchParams } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const program = await readUuidParam(
      (await params).id,
      "invalidRequestFields",
    );
    if (!program.ok) return program.response;
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      programOfficeHoursStudentsQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchProgramOfficeHoursStudents(
        auth.session.userId,
        program.id,
        query.data,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursStudentsLoadFailed"),
    });
  }
}
