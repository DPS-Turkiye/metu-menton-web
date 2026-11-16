import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeHoursRequestCard } from "@/components/office-hours/office-hours-request-card";
import { OfficeHoursAppointmentAction } from "@/interfaces/academician-office-hours";
import {
  OfficeHoursMessageType,
  OfficeHoursRequestStatus,
  OfficeHoursRole,
} from "@/interfaces/office-hours";
import {
  actOnOfficeHoursRequest,
  getInstructorSlots,
} from "@/lib/client/office-hours-booking";
import { officeHoursRequest } from "@test/fixtures/office-hours";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/office-hours-booking", () => ({
  actOnOfficeHoursRequest: vi.fn(),
  getInstructorSlots: vi.fn(),
}));

describe("OfficeHoursRequestCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(actOnOfficeHoursRequest).mockResolvedValue(officeHoursRequest());
    vi.mocked(getInstructorSlots).mockResolvedValue([]);
  });

  it("lets the academic accept one of the student's times", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <OfficeHoursRequestCard
        request={officeHoursRequest()}
        viewer={OfficeHoursRole.Instructor}
      />,
    );

    expect(screen.getByText("Ayşe Yılmaz ile")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kabul et" }));
    await user.click(
      screen.getByRole("radio", { name: "12 Kasım Perşembe · 10:30" }),
    );
    await user.click(screen.getByRole("button", { name: "Gönder" }));

    expect(actOnOfficeHoursRequest).toHaveBeenCalledWith("course-1", "req-1", {
      kind: "decision",
      payload: {
        status: "ACCEPTED",
        slot: "2026-11-12T10:30",
        message: undefined,
      },
    });
  });

  it("lets the academic ask a question only with the question written", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <OfficeHoursRequestCard
        request={officeHoursRequest()}
        viewer={OfficeHoursRole.Instructor}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Soru sor" }));
    const send = screen.getByRole("button", { name: "Gönder" });
    expect(send).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Öğrenciye sorun" }),
      "Hangi soru?",
    );
    await user.click(send);

    expect(actOnOfficeHoursRequest).toHaveBeenCalledWith("course-1", "req-1", {
      kind: "decision",
      payload: { status: "MORE_INFO_REQUESTED", message: "Hangi soru?" },
    });
  });

  it("lets the student take one of the offered times", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <OfficeHoursRequestCard
        request={officeHoursRequest({
          status: OfficeHoursRequestStatus.CounterProposed,
          proposedSlots: ["2026-11-19T09:00"],
          instructorMessage: "Bu saat uygun",
        })}
        viewer={OfficeHoursRole.Student}
      />,
    );

    expect(screen.getByText("Ali Kaya ile")).toBeInTheDocument();
    expect(screen.getByText("Not: Bu saat uygun")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Bu saati seç: 19 Kasım Perşembe · 09:00",
      }),
    );

    expect(actOnOfficeHoursRequest).toHaveBeenCalledWith("course-1", "req-1", {
      kind: "accept-proposed",
      payload: { slot: "2026-11-19T09:00" },
    });
  });

  it("lets the student answer the academic's question", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <OfficeHoursRequestCard
        request={officeHoursRequest({
          status: OfficeHoursRequestStatus.MoreInfoRequested,
          messages: [
            {
              id: "m1",
              authorId: "academic-1",
              type: OfficeHoursMessageType.InstructorQuestion,
              body: "Hangi soru?",
              createdAt: "2026-11-07T11:00:00Z",
            },
          ],
        })}
        viewer={OfficeHoursRole.Student}
      />,
    );

    expect(screen.getByText("Hangi soru?")).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Cevabını yaz" }),
      "3. soru",
    );
    await user.click(screen.getByRole("button", { name: "Cevabı gönder" }));

    expect(actOnOfficeHoursRequest).toHaveBeenCalledWith("course-1", "req-1", {
      kind: "reply",
      payload: { message: "3. soru" },
    });
  });

  it("shows an accepted request's meeting and no more actions", () => {
    renderWithQueryClient(
      <OfficeHoursRequestCard
        request={officeHoursRequest({
          status: OfficeHoursRequestStatus.Accepted,
          meeting: { startsAt: "2026-11-12T07:30:00Z", durationMinutes: 45 },
        })}
        viewer={OfficeHoursRole.Student}
      />,
    );

    expect(screen.getByText("Kabul edildi")).toBeInTheDocument();
    expect(screen.getByText(/Görüşme: 12 Kasım Perşembe/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Talebi geri çek" }),
    ).not.toBeInTheDocument();
  });

  it("shows an expired request with no actions for either side", () => {
    for (const viewer of [
      OfficeHoursRole.Student,
      OfficeHoursRole.Instructor,
    ]) {
      const { unmount } = renderWithQueryClient(
        <OfficeHoursRequestCard
          request={officeHoursRequest({
            status: OfficeHoursRequestStatus.Expired,
          })}
          viewer={viewer}
        />,
      );
      expect(screen.getByText("Süresi doldu")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("lets the student withdraw an open request", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <OfficeHoursRequestCard
        request={officeHoursRequest()}
        viewer={OfficeHoursRole.Student}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Talebi geri çek" }));

    expect(actOnOfficeHoursRequest).toHaveBeenCalledWith("course-1", "req-1", {
      kind: "withdraw",
    });
  });

  describe("cancelling a booked meeting", () => {
    // Thursday 12 November, 12:00 in Turkey.
    const NOW = new Date("2026-11-12T09:00:00Z");

    function booked(startsAt: string) {
      return officeHoursRequest({
        status: OfficeHoursRequestStatus.Accepted,
        meeting: { startsAt, durationMinutes: 45 },
        allowedActions: [OfficeHoursAppointmentAction.Cancel],
      });
    }

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("lets the student cancel without a reason", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={booked("2026-11-12T11:00:00Z")}
          viewer={OfficeHoursRole.Student}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "Görüşmeyi iptal et" }),
      );
      await user.click(screen.getByRole("button", { name: "İptal et" }));

      expect(actOnOfficeHoursRequest).toHaveBeenCalledWith(
        "course-1",
        "req-1",
        { kind: "cancel", payload: { reason: undefined } },
      );
    });

    it("asks the academic for a reason within 24 hours before sending", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={booked("2026-11-12T15:00:00Z")}
          viewer={OfficeHoursRole.Instructor}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "Görüşmeyi iptal et" }),
      );
      await user.click(screen.getByRole("button", { name: "İptal et" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Görüşmeye 24 saatten az kaldı; öğrenci için bir iptal sebebi yaz.",
      );
      expect(actOnOfficeHoursRequest).not.toHaveBeenCalled();

      await user.type(
        screen.getByRole("textbox", { name: /24 saatten az kaldı/ }),
        "  Fakülte kurulu  ",
      );
      await user.click(screen.getByRole("button", { name: "İptal et" }));

      expect(actOnOfficeHoursRequest).toHaveBeenCalledWith(
        "course-1",
        "req-1",
        { kind: "cancel", payload: { reason: "Fakülte kurulu" } },
      );
    });

    it("focuses the reason and drops the missing-reason error once something is typed", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={booked("2026-11-12T15:00:00Z")}
          viewer={OfficeHoursRole.Instructor}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "Görüşmeyi iptal et" }),
      );
      const reason = screen.getByRole("textbox", {
        name: /24 saatten az kaldı/,
      });
      expect(reason).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "İptal et" }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(reason).toHaveAttribute("aria-invalid", "true");

      await user.type(reason, "F");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(reason).toHaveAttribute("aria-invalid", "false");
    });

    it("asks for a reason when a card opened a day ahead is cancelled inside 24 hours", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={booked("2026-11-13T09:30:00Z")}
          viewer={OfficeHoursRole.Instructor}
        />,
      );
      // The card was opened 24.5 hours ahead; the academic comes back to it an hour later.
      vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));

      await user.click(
        screen.getByRole("button", { name: "Görüşmeyi iptal et" }),
      );

      expect(
        screen.getByRole("textbox", { name: /24 saatten az kaldı/ }),
      ).toBeRequired();
    });

    it("lets the academic cancel without a reason more than 24 hours ahead", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={booked("2026-11-14T09:00:00Z")}
          viewer={OfficeHoursRole.Instructor}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "Görüşmeyi iptal et" }),
      );
      expect(
        screen.getByRole("textbox", { name: "İptal sebebi (isteğe bağlı)" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "İptal et" }));

      expect(actOnOfficeHoursRequest).toHaveBeenCalledWith(
        "course-1",
        "req-1",
        { kind: "cancel", payload: { reason: undefined } },
      );
    });

    it("offers no cancel when the backend doesn't allow it", () => {
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={{ ...booked("2026-11-14T09:00:00Z"), allowedActions: [] }}
          viewer={OfficeHoursRole.Instructor}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Görüşmeyi iptal et" }),
      ).not.toBeInTheDocument();
    });

    // The list is as of the last load; a meeting that has started since stops offering it.
    it("offers no cancel once the meeting has started", () => {
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={booked("2026-11-12T08:30:00Z")}
          viewer={OfficeHoursRole.Student}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Görüşmeyi iptal et" }),
      ).not.toBeInTheDocument();
    });

    it("shows who cancelled, why, and that it was late", () => {
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={officeHoursRequest({
            status: OfficeHoursRequestStatus.Cancelled,
            meeting: { startsAt: "2026-11-12T11:00:00Z", durationMinutes: 45 },
            cancellation: {
              cancelledById: "academic-1",
              reason: "Fakülte kurulu",
              cancelledAt: "2026-11-12T08:00:00Z",
              late: true,
            },
          })}
          viewer={OfficeHoursRole.Student}
        />,
      );

      expect(screen.getByText("İptal edildi")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Ali Kaya görüşmeyi iptal etti · Neden: Fakülte kurulu/,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Son 24 saatte iptal")).toBeInTheDocument();
      expect(screen.getByText(/Görüşme: 12 Kasım/)).toHaveClass("line-through");
      expect(
        screen.queryByRole("button", { name: "Görüşmeyi iptal et" }),
      ).not.toBeInTheDocument();
    });

    it("tells the person who cancelled that they did", () => {
      renderWithQueryClient(
        <OfficeHoursRequestCard
          request={officeHoursRequest({
            status: OfficeHoursRequestStatus.Cancelled,
            meeting: { startsAt: "2026-11-14T09:00:00Z", durationMinutes: 45 },
            cancellation: {
              cancelledById: "student-1",
              reason: null,
              cancelledAt: "2026-11-12T08:00:00Z",
              late: false,
            },
          })}
          viewer={OfficeHoursRole.Student}
        />,
      );

      expect(screen.getByText("Görüşmeyi iptal ettin")).toBeInTheDocument();
      expect(screen.queryByText("Son 24 saatte iptal")).not.toBeInTheDocument();
    });
  });
});
