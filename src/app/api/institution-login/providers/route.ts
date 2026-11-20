import { fetchInstitutionProviders } from "@/lib/api/institution-login";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";

/** Which institution logins are on. Open to a signed-out visitor: the login page asks before it shows a button. */
export async function GET() {
  try {
    return backendResponse(await fetchInstitutionProviders());
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("institutionLoginFailed"),
    });
  }
}
