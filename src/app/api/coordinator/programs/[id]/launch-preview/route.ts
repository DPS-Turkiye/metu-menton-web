import { fetchLaunchPreview } from "@/lib/api/coordinator-programs";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/require-admin";

/** Who a draft semester's launch moves, for the admin's confirmation; only an admin launches. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    return backendResponse(await fetchLaunchPreview(auth.session.userId, id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("launchPreviewLoadFailed"),
    });
  }
}
