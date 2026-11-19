import { expect, type APIRequestContext } from "@playwright/test";

import { e2eEnv, serviceAuthorization } from "./env";

/**
 * Setting a scene through the backend, as the frontend does: the service credential and the acting person's id.
 * Only for preconditions; what a spec checks goes through the screens.
 */
export async function asPerson<T>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT",
  path: string,
  actorId: string,
  data?: unknown,
): Promise<T> {
  const url = `${e2eEnv.apiUrl}${path}${path.includes("?") ? "&" : "?"}actorId=${actorId}`;
  const response = await request.fetch(url, {
    method,
    headers: { Authorization: serviceAuthorization() },
    ...(data === undefined ? {} : { data }),
  });
  const text = await response.text();
  // The backend's error JSON says which rule refused the call; it carries no secrets.
  expect(
    response.ok(),
    `${method} ${path} answered ${response.status()}: ${text}`,
  ).toBe(true);
  return (text === "" ? undefined : JSON.parse(text)) as T;
}
