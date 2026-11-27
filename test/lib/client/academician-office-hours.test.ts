import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OfficeHoursAppointmentAction,
  OfficeHoursRequestAction,
} from "@/interfaces/academician-office-hours";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import {
  answerAcademicianRequest,
  cancelAcademicianAppointment,
  getAcademicianAppointments,
  getAcademicianAvailability,
  getAcademicianRequests,
  getOfficeHoursProfileSettings,
  saveAcademicianAvailability,
  saveOfficeHoursProfileSettings,
} from "@/lib/client/academician-office-hours";
import { ClientApiError } from "@/lib/client/api";
import { OFFICE_HOURS_AFFECTED_BOOKINGS_CHANGED } from "@/lib/const";
import { httpClient } from "@/lib/http-client";
import { AvailabilitySaveResult } from "@/types/academician-office-hours";
import {
  academicianAppointment,
  academicianAvailability,
} from "@test/fixtures/academician-office-hours";
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
const NOTHING_AFFECTED = { meetings: [], requests: [] };
const TIME = {
  startsAt: "2026-11-17T14:00:00+03:00",
  endsAt: "2026-11-17T14:30:00+03:00",
};
const affectedMeeting = {
  requestId: "request-1",
  status: OfficeHoursRequestStatus.Accepted,
  time: TIME,
  studentName: "Ali Kaya",
  topic: "Staj",
  courseName: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
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

  it("lists booked meetings as appointments the academician may cancel", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createMentorResponse([academicianMeeting()]),
    );

    const [appointment] = await getAcademicianAppointments();

    expect(httpClient.get).toHaveBeenCalledWith(`${BASE}/meetings`);
    expect(appointment?.allowedActions).toEqual([
      OfficeHoursAppointmentAction.Cancel,
    ]);
  });

  it("cancels a meeting through its request, with the reason", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(null, 204),
    );

    await cancelAcademicianAppointment(
      academicianAppointment({ id: "meeting-1", requestId: "request/1" }),
      "Fakülte kurulu",
    );

    expect(httpClient.post).toHaveBeenCalledWith(
      `${BASE}/requests/request%2F1/cancel`,
      { reason: "Fakülte kurulu" },
    );
  });

  it("passes on the backend's refusal of a meeting that has started", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse({ message: "started" }, 409),
    );

    await expect(
      cancelAcademicianAppointment(academicianAppointment(), null),
    ).rejects.toBeInstanceOf(ClientApiError);
  });

  it("reads and saves the availability with its one-off hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T09:00:00+03:00"));
    const settings = academicianAvailability({
      oneOffs: [{ id: "one-off-1", ...TIME, place: "B-204" }],
    });
    vi.mocked(httpClient.get).mockResolvedValue(createMentorResponse(settings));
    vi.mocked(httpClient.put).mockResolvedValue(createMentorResponse(settings));

    expect((await getAcademicianAvailability()).oneOffs).toEqual(
      settings.oneOffs,
    );
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(NOTHING_AFFECTED),
    );
    const payload = { ...settings, oneOffs: [{ ...TIME, place: "B-204" }] };
    const outcome = await saveAcademicianAvailability(payload, null);

    expect(httpClient.post).toHaveBeenCalledWith(
      `${BASE}/availability/preview`,
      payload,
    );
    expect(httpClient.put).toHaveBeenCalledWith(`${BASE}/availability`, {
      ...payload,
      confirmedAffected: [],
    });
    expect(outcome).toEqual({
      result: AvailabilitySaveResult.Saved,
      availability: expect.objectContaining({ oneOffs: settings.oneOffs }),
    });
  });

  it("leaves ended one-off hours out of a save", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T16:00:00+03:00"));
    const settings = academicianAvailability();
    vi.mocked(httpClient.put).mockResolvedValue(createMentorResponse(settings));
    const ahead = {
      startsAt: "2026-11-18T14:00:00+03:00",
      endsAt: "2026-11-18T15:00:00+03:00",
      place: null,
    };

    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(NOTHING_AFFECTED),
    );

    await saveAcademicianAvailability(
      { ...settings, oneOffs: [{ ...TIME, place: null }, ahead] },
      null,
    );

    // The preview sees the same hours as the save.
    expect(httpClient.post).toHaveBeenCalledWith(
      `${BASE}/availability/preview`,
      { ...settings, oneOffs: [ahead] },
    );
    expect(httpClient.put).toHaveBeenCalledWith(`${BASE}/availability`, {
      ...settings,
      oneOffs: [ahead],
      confirmedAffected: [],
    });
  });

  it("stops a change that touches a meeting for review, saving nothing", async () => {
    const impact = { meetings: [affectedMeeting], requests: [] };
    vi.mocked(httpClient.post).mockResolvedValue(createMentorResponse(impact));

    const outcome = await saveAcademicianAvailability(
      academicianAvailability(),
      null,
    );

    expect(outcome).toEqual({
      result: AvailabilitySaveResult.Review,
      impact,
      changed: false,
    });
    expect(httpClient.put).not.toHaveBeenCalled();
  });

  it("saves what the academician confirmed without asking again", async () => {
    const settings = academicianAvailability();
    vi.mocked(httpClient.put).mockResolvedValue(createMentorResponse(settings));
    const confirmed = [
      { requestId: "request-1", status: OfficeHoursRequestStatus.Accepted },
    ];

    const outcome = await saveAcademicianAvailability(settings, confirmed);

    expect(httpClient.post).not.toHaveBeenCalled();
    expect(httpClient.put).toHaveBeenCalledWith(
      `${BASE}/availability`,
      expect.objectContaining({ confirmedAffected: confirmed }),
    );
    expect(outcome.result).toBe(AvailabilitySaveResult.Saved);
  });

  it("brings back the fresh list when it changed after the review", async () => {
    const fresh = { meetings: [affectedMeeting], requests: [] };
    vi.mocked(httpClient.put).mockResolvedValue(
      createMentorResponse(
        {
          message: "Siz düzenlerken değişti.",
          code: OFFICE_HOURS_AFFECTED_BOOKINGS_CHANGED,
        },
        409,
      ),
    );
    vi.mocked(httpClient.post).mockResolvedValue(createMentorResponse(fresh));

    const outcome = await saveAcademicianAvailability(
      academicianAvailability(),
      [],
    );

    expect(outcome).toEqual({
      result: AvailabilitySaveResult.Review,
      impact: fresh,
      changed: true,
    });
  });

  it("saves once more when the list that changed is empty again", async () => {
    const settings = academicianAvailability();
    vi.mocked(httpClient.put)
      .mockResolvedValueOnce(
        createMentorResponse(
          { message: "changed", code: OFFICE_HOURS_AFFECTED_BOOKINGS_CHANGED },
          409,
        ),
      )
      .mockResolvedValueOnce(createMentorResponse(settings));
    vi.mocked(httpClient.post).mockResolvedValue(
      createMentorResponse(NOTHING_AFFECTED),
    );

    const outcome = await saveAcademicianAvailability(settings, [
      { requestId: "request-1", status: OfficeHoursRequestStatus.Pending },
    ]);

    expect(outcome.result).toBe(AvailabilitySaveResult.Saved);
    expect(httpClient.put).toHaveBeenLastCalledWith(
      `${BASE}/availability`,
      expect.objectContaining({ confirmedAffected: [] }),
    );
  });

  it("passes any other refusal of a save on", async () => {
    vi.mocked(httpClient.put).mockResolvedValue(
      createMentorResponse({ message: "Kaydedilemedi." }, 400),
    );

    await expect(
      saveAcademicianAvailability(academicianAvailability(), []),
    ).rejects.toBeInstanceOf(ClientApiError);
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("reads the whole profile as the backend sends it", async () => {
    const profile = officeHoursProfile({
      details: {
        about: "Makine öğrenmesi",
        topics: [{ title: "Staj", body: null }],
        courses: [{ code: "CENG 140", name: "C Programlama" }],
        expertise: ["ML"],
        responseDays: 2,
      },
    });
    vi.mocked(httpClient.get).mockResolvedValue(createMentorResponse(profile));

    expect(await getOfficeHoursProfileSettings()).toEqual(profile);
  });

  it("saves the whole profile in one call, without reading it first", async () => {
    const profile = officeHoursProfile({
      listed: false,
      defaultPlace: "B-101",
      emails: { newRequest: false, cancellation: true },
    });
    vi.mocked(httpClient.put).mockResolvedValue(createMentorResponse(profile));

    const saved = await saveOfficeHoursProfileSettings(profile);

    expect(httpClient.get).not.toHaveBeenCalled();
    expect(httpClient.put).toHaveBeenCalledWith(`${BASE}/profile`, profile);
    expect(saved).toEqual(profile);
  });
});
