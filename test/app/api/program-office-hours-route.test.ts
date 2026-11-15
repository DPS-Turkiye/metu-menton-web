import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/coordinator/programs/[id]/office-hours/appointments/route";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import { UserRole, type AppSession } from "@/interfaces/session";
import { fetchProgramOfficeHoursAppointments } from "@/lib/api/program-office-hours";
import { getSessionUser } from "@/lib/session";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/program-office-hours", () => ({
  fetchProgramOfficeHoursAppointments: vi.fn(),
}));

const PROGRAM_ID = "0a0a0a0a-0000-4000-8000-000000000001";
const program = { params: Promise.resolve({ id: PROGRAM_ID }) };

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@menton.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

function get(search: string) {
  return GET(new NextRequest(`http://localhost/x${search}`), program);
}

describe("program office hours appointments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    vi.mocked(fetchProgramOfficeHoursAppointments).mockResolvedValue({
      status: 200,
      data: {
        counts: {
          awaitingDecision: 0,
          alternativeProposed: 0,
          acceptedThisWeek: 0,
          declinedThisWeek: 0,
        },
        faculties: [],
        appointments: {
          content: [],
          page: 0,
          size: 25,
          totalElements: 0,
          totalPages: 0,
        },
      },
      headers: {},
    });
  });

  it("asks as the signed-in coordinator, never as an actor named in the query", async () => {
    const response = await get(
      "?status=PENDING&faculty=Fen&search=Ay%C5%9Fe&from=2026-11-09&to=2026-11-15&page=2&size=25&actorId=someone-else",
    );

    expect(response.status).toBe(200);
    expect(fetchProgramOfficeHoursAppointments).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM_ID,
      {
        status: OfficeHoursRequestStatus.Pending,
        faculty: "Fen",
        search: "Ayşe",
        from: "2026-11-09",
        to: "2026-11-15",
        page: 2,
        size: 25,
      },
    );
  });

  it("asks with no filters at all", async () => {
    expect((await get("")).status).toBe(200);
    expect(fetchProgramOfficeHoursAppointments).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM_ID,
      {},
    );
  });

  it.each([
    ["a status the list does not filter by", "?status=EXPIRED"],
    ["an unknown status", "?status=LOST"],
    ["one end of a date range", "?from=2026-11-09"],
    ["a day that is not a date", "?from=2026-13-40&to=2026-11-15"],
    ["a page written as text", "?page=abc"],
    ["an empty page", "?page="],
    ["a page size over the limit", "?size=500"],
    ["a page size of zero", "?size=0"],
    ["a page past any real list", "?page=99999999999"],
    [
      "a date range that ends before it starts",
      "?from=2026-11-15&to=2026-11-09",
    ],
    ["a date range longer than 62 days", "?from=2026-01-01&to=2026-03-04"],
  ])("refuses %s before the backend is called", async (_name, search) => {
    expect((await get(search)).status).toBe(400);
    expect(fetchProgramOfficeHoursAppointments).not.toHaveBeenCalled();
  });

  it("accepts a 62-day range, both ends included", async () => {
    expect((await get("?from=2026-01-01&to=2026-03-03")).status).toBe(200);
  });

  it("refuses a program id that is not a uuid before the backend is called", async () => {
    const response = await GET(new NextRequest("http://localhost/x"), {
      params: Promise.resolve({ id: ".." }),
    });
    expect(response.status).toBe(400);
    expect(fetchProgramOfficeHoursAppointments).not.toHaveBeenCalled();
  });

  it("lets the admin look, as the admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Admin));
    expect((await get("")).status).toBe(200);
    expect(fetchProgramOfficeHoursAppointments).toHaveBeenCalledWith(
      "ADMIN-1",
      PROGRAM_ID,
      {},
    );
  });

  it("keeps students, mentors and signed-out visitors out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await get("")).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    expect((await get("")).status).toBe(403);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentor));
    expect((await get("")).status).toBe(403);
    expect(fetchProgramOfficeHoursAppointments).not.toHaveBeenCalled();
  });

  it("answers 502 when the backend cannot be reached", async () => {
    vi.mocked(fetchProgramOfficeHoursAppointments).mockRejectedValue(
      new Error("down"),
    );
    const response = await get("");
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: "officeHoursAppointmentsLoadFailed",
    });
  });
});
