import { beforeEach, describe, vi } from "vitest";

import {
  addIskurInterns,
  getIskurInterns,
  removeIskurIntern,
} from "@/lib/client/iskur-interns";
import {
  itSendsEachClientCall,
  type ClientCall,
} from "@test/fixtures/client-calls";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const BASE = "/api/coordinator/programs/p%2F1/iskur/interns";

const calls: ClientCall[] = [
  {
    title: "getIskurInterns reads the program's intern list",
    call: () => getIskurInterns("p/1"),
    method: "get",
    args: [BASE],
  },
  {
    title: "addIskurInterns adds pasted addresses",
    call: () => addIskurInterns("p/1", ["ayse@example.test"]),
    method: "post",
    args: [BASE, { emails: ["ayse@example.test"] }],
  },
  {
    title: "removeIskurIntern removes one entry",
    call: () => removeIskurIntern("p/1", "e/1"),
    method: "delete",
    args: [`${BASE}/e%2F1`],
  },
];

describe("İŞKUR intern list client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  itSendsEachClientCall(calls);
});
