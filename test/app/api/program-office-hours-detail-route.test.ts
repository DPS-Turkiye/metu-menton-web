import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/coordinator/programs/[id]/office-hours/appointments/[requestId]/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import { fetchProgramOfficeHoursAppointment } from "@/lib/api/program-office-hours";
import { getSessionUser } from "@/lib/session";
import { appointmentDetail } from "@test/fixtures/program-office-hours";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/program-office-hours", () => ({
  fetchProgramOfficeHoursAppointment: vi.fn(),
}));

const PROGRAM_ID = "0a0a0a0a-0000-4000-8000-000000000001";
const REQUEST_ID = "0c000000-0000-4000-8000-000000000002";

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@menton.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

function get(id = PROGRAM_ID, requestId = REQUEST_ID) {
  return GET(new Request("http://localhost/x?actorId=someone-else"), {
    params: Promise.resolve({ id, requestId }),
  });
}

describe("program office hours appointment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    vi.mocked(fetchProgramOfficeHoursAppointment).mockResolvedValue({
      status: 200,
      data: appointmentDetail(),
      headers: {},
    });
  });

  it("asks as the signed-in coordinator, whatever actor the URL names", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(fetchProgramOfficeHoursAppointment).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM_ID,
      REQUEST_ID,
    );
  });

  it.each([
    ["a program id", "..", REQUEST_ID],
    ["a request id", PROGRAM_ID, "../../admin"],
  ])(
    "refuses %s that is not a uuid before the backend is called",
    async (_name, id, requestId) => {
      expect((await get(id, requestId)).status).toBe(400);
      expect(fetchProgramOfficeHoursAppointment).not.toHaveBeenCalled();
    },
  );

  it("keeps students, mentors and signed-out visitors out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    expect((await get()).status).toBe(403);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentor));
    expect((await get()).status).toBe(403);
    expect(fetchProgramOfficeHoursAppointment).not.toHaveBeenCalled();
  });

  it("answers 502 with its own message when the backend cannot be reached", async () => {
    vi.mocked(fetchProgramOfficeHoursAppointment).mockRejectedValue(
      new Error("down"),
    );

    const response = await get();

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: "officeHoursAppointmentLoadFailed",
    });
  });
});
