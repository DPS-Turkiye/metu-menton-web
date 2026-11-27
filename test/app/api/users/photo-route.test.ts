import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/users/[id]/photo/route";
import { fetchPersonPhoto } from "@/lib/api/person-photo";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionIds } from "@/lib/session";
import { backendRefusal } from "@test/fixtures/route-handlers";

vi.mock("@/lib/api/person-photo", () => ({ fetchPersonPhoto: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSessionIds: vi.fn() }));

const PERSON_ID = "00000000-0000-4000-8000-000000000805";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function photo(contentType: string, status = 200) {
  return { data: PNG.buffer, headers: { "content-type": contentType }, status };
}

function get(id = PERSON_ID) {
  return GET(new Request(`http://localhost/api/users/${id}/photo`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/users/[id]/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionIds).mockResolvedValue({
      userId: "viewer-1",
      organizationId: "",
    });
  });

  it("asks the backend as the signed-in person and sends the photo inline, cached privately", async () => {
    vi.mocked(fetchPersonPhoto).mockResolvedValue(photo("image/png"));

    const response = await get();

    expect(fetchPersonPhoto).toHaveBeenCalledWith(PERSON_ID, "viewer-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe(
      "sandbox; default-src 'none'",
    );
    expect(response.headers.get("cache-control")).toBe("private, max-age=600");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
  });

  it("answers 204 when there is no photo to show, so the initials stay", async () => {
    vi.mocked(fetchPersonPhoto).mockResolvedValue(
      backendRefusal(404, { message: "Photo not found" }),
    );

    const response = await get();

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("private, max-age=600");
    expect(await response.text()).toBe("");
  });

  it("never sends anything but a PNG, JPEG or WebP", async () => {
    vi.mocked(fetchPersonPhoto).mockResolvedValue(photo("text/html"));

    const response = await get();

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toMatch(/json/);
  });

  it("reads a content type with parameters", async () => {
    vi.mocked(fetchPersonPhoto).mockResolvedValue(
      photo("IMAGE/JPEG; charset=binary"),
    );

    const response = await get();

    expect(response.headers.get("content-type")).toBe("image/jpeg");
  });

  it("passes other backend failures on without caching them", async () => {
    vi.mocked(fetchPersonPhoto).mockResolvedValue(backendRefusal(500));

    const response = await get();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).not.toBe(
      "private, max-age=600",
    );
  });

  it("answers 401 without a session and never asks the backend", async () => {
    vi.mocked(getSessionIds).mockRejectedValue(new SessionRequiredError());

    const response = await get();

    expect(response.status).toBe(401);
    expect(fetchPersonPhoto).not.toHaveBeenCalled();
  });

  it("answers 401 for a session without a user", async () => {
    vi.mocked(getSessionIds).mockResolvedValue({
      userId: "",
      organizationId: "",
    });

    const response = await get();

    expect(response.status).toBe(401);
    expect(fetchPersonPhoto).not.toHaveBeenCalled();
  });

  it("answers 400 for an id that is not a uuid", async () => {
    const response = await get("..");

    expect(response.status).toBe(400);
    expect(fetchPersonPhoto).not.toHaveBeenCalled();
  });
});
