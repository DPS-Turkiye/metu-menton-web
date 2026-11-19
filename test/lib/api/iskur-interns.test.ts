import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addIskurInterns,
  fetchIskurInterns,
  removeIskurIntern,
} from "@/lib/api/iskur-interns";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const BASE = "/api/coordinator/programs/p%2F1/iskur/interns";

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads the list",
    () => fetchIskurInterns("c1", "p/1"),
    { method: "GET", url: BASE, params: { actorId: "c1" } },
  ],
  [
    "adds addresses",
    () => addIskurInterns("c1", "p/1", ["ayse@example.test"]),
    {
      method: "POST",
      url: BASE,
      data: { actorId: "c1", emails: ["ayse@example.test"] },
    },
  ],
  [
    "removes an encoded entry",
    () => removeIskurIntern("c1", "p/1", "e/1"),
    { method: "DELETE", url: `${BASE}/e%2F1`, params: { actorId: "c1" } },
  ],
];

describe("İŞKUR intern list server API", () => {
  beforeEach(() => {
    vi.mocked(backendRequest).mockReset();
  });

  it.each(cases)("%s", async (_description, call, request) => {
    vi.mocked(backendRequest).mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    await call();

    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
