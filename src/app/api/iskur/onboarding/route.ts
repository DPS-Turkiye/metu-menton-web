import {
  fetchIskurOnboarding,
  saveIskurOnboardingDraft,
} from "@/lib/api/iskur-onboarding";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurOnboardingSchema } from "@/lib/server/iskur-onboarding-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    return backendResponse(await fetchIskurOnboarding(session.userId));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurOnboardingLoadFailed"),
    });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, iskurOnboardingSchema, {
      invalidMessage: "iskurOnboardingInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await saveIskurOnboardingDraft(session.userId, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurOnboardingSaveFailed"),
    });
  }
}
