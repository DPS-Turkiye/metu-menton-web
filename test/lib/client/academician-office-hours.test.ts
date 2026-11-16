import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeHoursRequestAction } from "@/interfaces/academician-office-hours";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import {
  answerAcademicianRequest,
  cancelAcademicianAppointment,
  getAcademicianAppointments,
  getAcademicianAvailability,
  getAcademicianRequests,
  getOfficeHoursProfileSettings,
  OfficeHoursFeatureUnavailableError,
  saveAcademicianAvailability,
  saveOfficeHoursProfileSettings,
} from "@/lib/client/academician-office-hours";
import { ClientApiError } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";
import { academicianAvailability } from "@test/fixtures/academician-office-hours";
import { createMentorResponse } from "@test/fixtures/mentors";
import {
  academicianMeeting,
  inboxRequest,
  officeHoursProfile,
} from "@test/fixtures/office-hours-me";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const BASE = "/api/office-hours/me";
const TIME = {
  startsAt: "2026-11-17T14:00:00+03:00",
  endsAt: "2026-11-17T14:30:00+03:00",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("academician Office Hours client", () => {
  it("lists only the inbox's open requests", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createMentorResponse([
        inboxRequest({ id: "waiting" }),
        inboxRequest({ id: "done", status: OfficeHoursRequestStatus.Accepted }),
      ]),
    );

    const requests = await getAcademicianRequests();

    expect(httpClient.get).toHaveBeenCalledWith(`${BASE}/inbox`);
    expect(requests.map((request) => request.id)).toEqual(["waiting"]);
  });

  it("says nothing is waiting when the inbox is empty", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(createMentorResponse([]));

    expect(await getAcademicianRequests()).toEqual([]);
  });

  it("sends the answer in the backend's words and reports the request settled once accepted", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(
        inboxRequest({
          status: OfficeHoursRequestStatus.Accepted,
          allowedActions: [],
        }),
      ),
    );

    const answered = await answerAcademicianRequest("request-1", {
      action: OfficeHoursRequestAction.Accept,
      time: TIME,
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      `${BASE}/requests/request-1/decision`,
      { action: OfficeHoursRequestAction.Accept, time: TIME.startsAt },
    );
    expect(answered).toBeNull();
  });

  it("hands back a request that is still open after other times were offered", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(
        inboxRequest({
          status: OfficeHoursRequestStatus.CounterProposed,
          proposedTimes: [TIME],
        }),
      ),
    );

    const answered = await answerAcademicianRequest("request-1", {
      action: OfficeHoursRequestAction.ProposeTimes,
      times: [TIME],
      note: "Şunlar uygun",
    });

    expect(answered?.proposedTimes).toEqual([TIME]);
  });

  it("passes on the backend's refusal when the request moved on before the answer arrived", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(
        { message: "This request can no longer be answered" },
        400,
      ),
    );

    await expect(
      answerAcademicianRequest("request-1", {
        action: OfficeHoursRequestAction.Decline,
        reason: null,
      }),
    ).rejects.toBeInstanceOf(ClientApiError);
  });

  it("lists booked meetings as appointments that offer no cancel yet", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createMentorResponse([academicianMeeting()]),
    );

    const [appointment] = await getAcademicianAppointments();

    expect(httpClient.get).toHaveBeenCalledWith(`${BASE}/meetings`);
    expect(appointment?.allowedActions).toEqual([]);
  });

  it("refuses to cancel until cancelling has its backend", async () => {
    await expect(
      cancelAcademicianAppointment("meeting-1", null),
    ).rejects.toBeInstanceOf(OfficeHoursFeatureUnavailableError);
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("reads and saves the weekly availability without one-offs", async () => {
    const { oneOffs: _ignored, ...settings } = academicianAvailability();
    vi.mocked(httpClient.get).mockResolvedValue(createMentorResponse(settings));
    vi.mocked(httpClient.put).mockResolvedValue(createMentorResponse(settings));

    expect((await getAcademicianAvailability()).oneOffs).toEqual([]);
    const saved = await saveAcademicianAvailability({
      ...settings,
      oneOffs: [],
    });

    expect(httpClient.put).toHaveBeenCalledWith(
      `${BASE}/availability`,
      settings,
    );
    expect(saved.rules).toEqual(settings.rules);
  });

  it("refuses to save one-off hours instead of dropping them silently", async () => {
    const { oneOffs: _ignored, ...settings } = academicianAvailability();

    await expect(
      saveAcademicianAvailability({
        ...settings,
        oneOffs: [{ ...TIME, place: null }],
      }),
    ).rejects.toBeInstanceOf(OfficeHoursFeatureUnavailableError);
    expect(httpClient.put).not.toHaveBeenCalled();
  });

  it("reads where and how students meet them", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createMentorResponse(officeHoursProfile()),
    );

    expect(await getOfficeHoursProfileSettings()).toEqual({
      defaultPlace: "A-204",
      onlineLink: "https://meet.example.com/abc",
      contactEmail: null,
    });
  });

  it("keeps whether students see them as saved, since this screen does not set it", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createMentorResponse(officeHoursProfile({ listed: false })),
    );
    vi.mocked(httpClient.put).mockResolvedValue(
      createMentorResponse(
        officeHoursProfile({ listed: false, defaultPlace: "B-101" }),
      ),
    );

    const saved = await saveOfficeHoursProfileSettings({
      defaultPlace: "B-101",
      onlineLink: null,
      contactEmail: null,
    });

    expect(httpClient.put).toHaveBeenCalledWith(`${BASE}/profile`, {
      defaultPlace: "B-101",
      onlineLink: null,
      contactEmail: null,
      listed: false,
    });
    expect(saved.defaultPlace).toBe("B-101");
  });
});
