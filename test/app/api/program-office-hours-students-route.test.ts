import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/coordinator/programs/[id]/office-hours/students/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import { fetchProgramOfficeHoursStudents } from "@/lib/api/program-office-hours";
import { getSessionUser } from "@/lib/session";
import { programStudents } from "@test/fixtures/program-office-hours-students";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/program-office-hours", () => ({
  fetchProgramOfficeHoursStudents: vi.fn(),
}));

const PROGRAM_ID = "0a0a0a0a-0000-4000-8000-000000000001";

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@menton.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

function get(search: string, id = PROGRAM_ID) {
  return GET(new NextRequest(`http://localhost/x${search}`), {
    params: Promise.resolve({ id }),
  });
}

describe("program office hours students route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    vi.mocked(fetchProgramOfficeHoursStudents).mockResolvedValue({
      status: 200,
      data: programStudents(),
      headers: {},
    });
  });

  it("asks as the signed-in coordinator, whatever actor the query names", async () => {
    expect(
      (
        await get(
          "?search=Ay%C5%9Fe&faculty=Fen&awaitingOnly=true&page=1&size=25&actorId=x",
        )
      ).status,
    ).toBe(200);
    expect(fetchProgramOfficeHoursStudents).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM_ID,
      {
        search: "Ayşe",
        faculty: "Fen",
        awaitingOnly: true,
        page: 1,
        size: 25,
      },
    );
  });

  it.each([
    ["a yes/no that is neither", "?awaitingOnly=yes"],
    ["a page written as text", "?page=abc"],
    ["a page size over the limit", "?size=500"],
  ])("refuses %s before the backend is called", async (_name, search) => {
    expect((await get(search)).status).toBe(400);
    expect(fetchProgramOfficeHoursStudents).not.toHaveBeenCalled();
  });

  it("refuses a program id that is not a uuid", async () => {
    expect((await get("", "..")).status).toBe(400);
    expect(fetchProgramOfficeHoursStudents).not.toHaveBeenCalled();
  });

  it("keeps students, mentors and signed-out visitors out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await get("")).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    expect((await get("")).status).toBe(403);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentor));
    expect((await get("")).status).toBe(403);
    expect(fetchProgramOfficeHoursStudents).not.toHaveBeenCalled();
  });

  it("answers 502 with its own message when the backend cannot be reached", async () => {
    vi.mocked(fetchProgramOfficeHoursStudents).mockRejectedValue(
      new Error("down"),
    );
    const response = await get("");
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: "officeHoursStudentsLoadFailed",
    });
  });
});
