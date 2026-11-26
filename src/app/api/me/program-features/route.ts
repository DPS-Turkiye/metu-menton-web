import { NextResponse } from "next/server";

import type { MyProgramFeatures } from "@/interfaces/program";
import { fetchUser } from "@/lib/api/accounts";
import { featureList } from "@/lib/program-features";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

const OK = 200;

/**
 * The features of the semester the signed-in person is in, read live: the session cookie keeps the account as it was
 * at sign-in, and a launch or an admin's move changes the semester after that.
 */
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const response = await fetchUser(session.userId, session.userId);
    if (response.status !== OK) return backendResponse(response);
    const body: MyProgramFeatures = {
      programFeatures: featureList(response.data.programFeatures),
    };
    return NextResponse.json(body);
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("programFeaturesLoadFailed"),
    });
  }
}
