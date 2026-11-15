import type { NextRequest } from "next/server";

import { fetchProgramOfficeHoursAppointments } from "@/lib/api/program-office-hours";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { programOfficeHoursQuerySchema } from "@/lib/server/program-office-hours-schemas";
import { readSearchParams } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      programOfficeHoursQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchProgramOfficeHoursAppointments(
        auth.session.userId,
        id,
        query.data,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursAppointmentsLoadFailed"),
    });
  }
}
