import { NextResponse } from "next/server";

import { startInstitutionLogin } from "@/lib/api/institution-login";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { rememberInstitutionLogin } from "@/lib/server/institution-login-cookie";
import {
  RETRY_AFTER_HEADER,
  takeInstitutionLoginStart,
} from "@/lib/server/institution-login-limit";
import { toInstitutionProvider } from "@/lib/server/institution-provider";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const provider = toInstitutionProvider((await params).provider);
    if (!provider) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: await apiText("institutionUnknown") },
        { status: 404 },
      );
    }
    const turn = takeInstitutionLoginStart(request.headers);
    if (!turn.allowed) {
      return NextResponse.json(
        {
          code: "RATE_LIMITED",
          message: await apiText("institutionLoginTooMany"),
        },
        {
          status: 429,
          headers: { [RETRY_AFTER_HEADER]: String(turn.retryAfterSeconds) },
        },
      );
    }
    const started = await startInstitutionLogin(provider);
    const response = backendResponse(started);
    return started.status === 200
      ? await rememberInstitutionLogin(response, {
          provider,
          state: started.data.state,
          next: null,
        })
      : response;
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("institutionLoginFailed"),
    });
  }
}
