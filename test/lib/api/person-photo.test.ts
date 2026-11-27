import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPersonPhoto } from "@/lib/api/person-photo";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

describe("person photo server API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for the bytes as the session's actor, accepting the backend's JSON errors too", async () => {
    await fetchPersonPhoto("person/1", "viewer-1");

    expect(backendRequest).toHaveBeenCalledWith({
      method: HttpMethod.Get,
      url: "/api/users/person%2F1/photo",
      params: { actorId: "viewer-1" },
      responseType: "arraybuffer",
      headers: { Accept: "*/*" },
    });
  });
});
