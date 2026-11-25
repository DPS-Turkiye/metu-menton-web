import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentAppointmentsView } from "@/components/student/appointments-view";
import {
  AppointmentKind,
  AppointmentSide,
  AppointmentStatus,
} from "@/interfaces/appointment";
import { getStudentAppointments } from "@/lib/client/student-appointments";
import {
  answerOfficeHoursAlternative,
  cancelStudentOfficeHoursAppointment,
} from "@/lib/client/student-office-hours";
import {
  APPOINTMENTS_NOW,
  peerAppointment,
  STUDENT_APPOINTMENTS,
} from "@test/fixtures/student-appointments";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/student-appointments", () => ({
  getStudentAppointments: vi.fn(),
}));
vi.mock("@/lib/client/student-office-hours", () => ({
  answerOfficeHoursAlternative: vi.fn(),
  cancelStudentOfficeHoursAppointment: vi.fn(),
}));

const alternative = peerAppointment({
  id: "alt",
  requestId: null,
  kind: AppointmentKind.OfficeHours,
  category: null,
  status: AppointmentStatus.AlternativeProposed,
  topic: "CV ve yüksek lisans seçenekleri",
  counterpart: {
    userId: "academician-1",
    fullName: "Ahmet Kaya",
    title: "Prof. Dr.",
    department: null,
  },
  startsAt: "2026-11-12T11:00:00.000Z",
  endsAt: "2026-11-12T11:30:00.000Z",
  alternative: {
    startsAt: "2026-11-13T07:30:00.000Z",
    endsAt: "2026-11-13T08:00:00.000Z",
  },
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(APPOINTMENTS_NOW);
  vi.mocked(getStudentAppointments)
    .mockReset()
    .mockResolvedValue(structuredClone([...STUDENT_APPOINTMENTS, alternative]));
});

afterEach(() => {
  vi.useRealTimers();
});

async function panel() {
  return screen.findByRole("tabpanel");
}

describe("StudentAppointmentsView", () => {
  it("lists the confirmed sessions ahead and marks the first for the tour", async () => {
    const { container } = renderWithQueryClient(<StudentAppointmentsView />);

    const list = within(await panel()).getAllByRole("article");
    expect(list).toHaveLength(2);
    expect(
      within(list[0] ?? document.body).getByText("Mert Yılmaz"),
    ).toBeVisible();
    expect(
      container.querySelector('[data-tour="appointments-first-row"]'),
    ).toBe(list[0]);
    expect(screen.getByRole("tab", { name: /Yaklaşan/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the requested and the proposed time of a request", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Talepler/ }));

    const card = within(await panel()).getByRole("article");
    expect(within(card).getByText("Prof. Dr. Ahmet Kaya")).toBeVisible();
    expect(within(card).getByText("Talep ettiğin")).toBeVisible();
    expect(within(card).getByText("Önerilen")).toBeVisible();
    expect(within(card).getByText("Alternatif Saat Önerildi")).toBeVisible();
  });

  it("lets the student accept an Office Hours alternative time", async () => {
    vi.mocked(answerOfficeHoursAlternative).mockResolvedValue({
      ...alternative,
      status: AppointmentStatus.Confirmed,
    });
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Talepler/ }));
    const card = within(await panel()).getByRole("article");
    expect(within(card).getByRole("button", { name: "Reddet" })).toBeVisible();
    await userEvent.click(
      within(card).getByRole("button", { name: "Önerilen saati kabul et" }),
    );
    expect(answerOfficeHoursAlternative).toHaveBeenCalledWith(
      "alt",
      true,
      alternative.alternative?.startsAt ?? null,
    );
    expect(
      await screen.findByText(
        "Önerilen saati kabul ettin; randevun onaylandı.",
      ),
    ).toBeVisible();
  });

  it("lets the student decline an alternative, which withdraws the request", async () => {
    vi.mocked(answerOfficeHoursAlternative).mockResolvedValue({
      ...alternative,
      status: AppointmentStatus.Withdrawn,
    });
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Talepler/ }));
    const card = within(await panel()).getByRole("article");
    await userEvent.click(within(card).getByRole("button", { name: "Reddet" }));
    expect(answerOfficeHoursAlternative).toHaveBeenCalledWith(
      "alt",
      false,
      null,
    );
    expect(
      await screen.findByText(
        "Önerilen saati reddettin; talebin geri çekildi.",
      ),
    ).toBeVisible();
  });

  it("shows every offered time with the academician's note and takes the one picked", async () => {
    const times = [
      {
        startsAt: "2026-11-13T07:30:00.000Z",
        endsAt: "2026-11-13T08:00:00.000Z",
      },
      {
        startsAt: "2026-11-16T08:00:00.000Z",
        endsAt: "2026-11-16T08:30:00.000Z",
      },
      {
        startsAt: "2026-11-17T12:00:00.000Z",
        endsAt: "2026-11-17T12:30:00.000Z",
      },
    ];
    vi.mocked(getStudentAppointments).mockResolvedValue([
      {
        ...alternative,
        alternatives: times,
        counterpartMessage: "Perşembe dolu, bunlardan biri olur mu?",
        canAcceptAlternative: true,
        canWithdraw: false,
      },
    ]);
    vi.mocked(answerOfficeHoursAlternative).mockResolvedValue({
      ...alternative,
      status: AppointmentStatus.Confirmed,
    });
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Talepler/ }));
    const card = within(await panel()).getByRole("article");

    expect(
      within(card).getByText("“Perşembe dolu, bunlardan biri olur mu?”"),
    ).toBeVisible();
    expect(
      within(card).queryByRole("button", { name: "Reddet" }),
    ).not.toBeInTheDocument();
    const accepts = within(card).getAllByRole("button", {
      name: /önerisini kabul et$/,
    });
    expect(accepts).toHaveLength(3);
    await userEvent.click(accepts[1] ?? document.body);
    expect(answerOfficeHoursAlternative).toHaveBeenCalledWith(
      "alt",
      true,
      times[1]?.startsAt,
    );
  });

  it("gives the reason a cancelled appointment was called off", async () => {
    vi.mocked(getStudentAppointments).mockResolvedValue([
      {
        ...alternative,
        status: AppointmentStatus.Cancelled,
        alternative: null,
        rejectReason: "Fakülte kurulu",
        canAcceptAlternative: false,
      },
    ]);
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Geçmiş/ }));
    const card = within(await panel()).getByRole("article");
    expect(within(card).getByText("Gerekçe: Fakülte kurulu")).toBeVisible();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  describe("cancelling a booked Office Hours meeting", () => {
    const booked = {
      ...alternative,
      id: "booked",
      status: AppointmentStatus.Confirmed,
      alternative: null,
      startsAt: "2026-11-10T11:00:00.000Z",
      endsAt: "2026-11-10T11:30:00.000Z",
      canCancel: true,
    };

    beforeEach(() => {
      vi.mocked(getStudentAppointments).mockResolvedValue([booked]);
      vi.mocked(cancelStudentOfficeHoursAppointment)
        .mockReset()
        .mockResolvedValue();
    });

    async function openDialog() {
      renderWithQueryClient(<StudentAppointmentsView />);
      const card = within(await panel()).getByRole("article");
      await userEvent.click(
        within(card).getByRole("button", { name: "Randevuyu iptal et" }),
      );
      return screen.getByRole("dialog", {
        name: "Randevuyu iptal etmek istiyor musun?",
      });
    }

    it("asks first, then cancels with the reason the student gave", async () => {
      const dialog = await openDialog();
      expect(
        within(dialog).getByText(
          "Prof. Dr. Ahmet Kaya bildirim alır. Bu işlem geri alınamaz.",
        ),
      ).toBeVisible();

      await userEvent.type(
        within(dialog).getByRole("textbox", {
          name: "İptal nedeni (opsiyonel)",
        }),
        "  Sınavım çakıştı  ",
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Randevuyu İptal Et" }),
      );

      expect(cancelStudentOfficeHoursAppointment).toHaveBeenCalledWith(
        "booked",
        "Sınavım çakıştı",
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("sends no reason when none was written", async () => {
      const dialog = await openDialog();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Randevuyu İptal Et" }),
      );

      expect(cancelStudentOfficeHoursAppointment).toHaveBeenCalledWith(
        "booked",
        null,
      );
    });

    it("keeps the meeting with Vazgeç", async () => {
      const dialog = await openDialog();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Vazgeç" }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(cancelStudentOfficeHoursAppointment).not.toHaveBeenCalled();
    });

    it("keeps the dialog open when the cancel fails", async () => {
      vi.mocked(cancelStudentOfficeHoursAppointment).mockRejectedValue(
        new Error("Görüşme başladı."),
      );
      const dialog = await openDialog();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Randevuyu İptal Et" }),
      );

      expect(cancelStudentOfficeHoursAppointment).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("offers no cancel, and no empty action row, once the meeting has started", async () => {
      vi.mocked(getStudentAppointments).mockResolvedValue([
        {
          ...booked,
          startsAt: "2026-11-09T08:30:00.000Z",
          endsAt: "2026-11-09T09:30:00.000Z",
        },
      ]);
      renderWithQueryClient(<StudentAppointmentsView />);
      const card = within(await panel()).getByRole("article");

      expect(within(card).queryByRole("button")).not.toBeInTheDocument();
      // The card ends with its actions row when it has one; a started meeting leaves no empty row behind.
      expect(card.lastElementChild).not.toBeEmptyDOMElement();
    });

    it("offers no cancel unless the backend allows it", async () => {
      vi.mocked(getStudentAppointments).mockResolvedValue([
        { ...booked, canCancel: false },
      ]);
      renderWithQueryClient(<StudentAppointmentsView />);
      const card = within(await panel()).getByRole("article");

      expect(
        within(card).queryByRole("button", { name: "Randevuyu iptal et" }),
      ).not.toBeInTheDocument();
    });
  });

  it("adds a kind's answer buttons through renderActions", async () => {
    renderWithQueryClient(
      <StudentAppointmentsView
        renderActions={(item) =>
          item.kind === AppointmentKind.OfficeHours ? (
            <button type="button">Ek işlem</button>
          ) : null
        }
      />,
    );
    await userEvent.click(await screen.findByRole("tab", { name: /Talepler/ }));
    expect(
      within(await panel()).getByRole("button", { name: "Ek işlem" }),
    ).toBeVisible();
  });

  it("confirms a request just sent and opens Talepler", async () => {
    const { container } = renderWithQueryClient(
      <StudentAppointmentsView sentTo="Prof. Dr. Ahmet Kaya" />,
    );
    expect(await screen.findByText("Randevu talebin gönderildi")).toBeVisible();
    expect(
      screen.getByText(
        "Prof. Dr. Ahmet Kaya yanıtladığında bildirim alacaksın.",
      ),
    ).toBeVisible();
    expect(
      container.querySelector('[data-tour="appointment-request-sent"]'),
    ).not.toBeNull();
    expect(
      await screen.findByRole("tab", { name: /Talepler/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("narrows everything with the filter and renders the toolbar", async () => {
    renderWithQueryClient(
      <StudentAppointmentsView
        filter={(item) => item.side === AppointmentSide.Mentee}
        toolbar={<p>Rol filtresi</p>}
      />,
    );
    expect(screen.getByText("Rol filtresi")).toBeVisible();
    expect(within(await panel()).getAllByRole("article")).toHaveLength(1);
  });

  it("moves between the tabs with the arrow keys", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    const upcoming = await screen.findByRole("tab", { name: /Yaklaşan/ });
    expect(upcoming).toHaveAttribute("tabindex", "0");
    upcoming.focus();
    await userEvent.keyboard("{ArrowRight}");
    const requests = screen.getByRole("tab", { name: /Talepler/ });
    expect(requests).toHaveAttribute("aria-selected", "true");
    expect(requests).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Geçmiş/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(upcoming).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{Home}");
    expect(upcoming).toHaveAttribute("aria-selected", "true");
  });

  it("explains the statuses under the list", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    expect(screen.getByText(/^Onay Bekliyor: henüz yanıt yok\./)).toBeVisible();
  });

  it("splits Talepler by who answers next, and lets the student take a request back", async () => {
    const pending = {
      ...alternative,
      id: "pending",
      status: AppointmentStatus.Pending,
      alternative: null,
      canWithdraw: true,
    };
    vi.mocked(getStudentAppointments).mockResolvedValue([alternative, pending]);
    vi.mocked(answerOfficeHoursAlternative)
      .mockReset()
      .mockResolvedValue({
        ...pending,
        status: AppointmentStatus.Withdrawn,
      });
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Talepler/ }));

    const mine = screen.getByRole("region", { name: "Yanıtını bekliyor" });
    expect(
      within(mine).getByRole("button", { name: "Önerilen saati kabul et" }),
    ).toBeVisible();
    const theirs = screen.getByRole("region", { name: "Yanıt bekleniyor" });
    expect(
      within(theirs).getByText(/^Office Hours · Per 12 Kas · /),
    ).toBeVisible();
    await userEvent.click(
      within(theirs).getByRole("button", { name: "Talebi geri çek" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Talebini geri çekmek istiyor musun?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Vazgeç" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(answerOfficeHoursAlternative).not.toHaveBeenCalled();

    await userEvent.click(
      within(theirs).getByRole("button", { name: "Talebi geri çek" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Talebi geri çek",
      }),
    );
    expect(answerOfficeHoursAlternative).toHaveBeenCalledWith(
      "pending",
      false,
      null,
    );
    expect(await screen.findByText("Talebin geri çekildi.")).toBeVisible();
  });

  it("says in Geçmiş which meetings were held", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await userEvent.click(await screen.findByRole("tab", { name: /Geçmiş/ }));
    expect(within(await panel()).getByText("Tamamlandı")).toBeVisible();
    expect(within(await panel()).getByText("İptal Edildi")).toBeVisible();
  });

  it("switches to the week and shows the picked session's detail", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Hafta" }));

    expect(
      screen.getByRole("heading", { name: "9 – 15 Kasım 2026" }),
    ).toBeVisible();
    const detail = screen.getByRole("region", {
      name: "CV ve yüksek lisans seçenekleri",
    });
    expect(within(detail).getByText(/^Önerilen: Cum 13 Kas · /)).toBeVisible();
    expect(
      within(detail).getByText(/^Talep ettiğin: Per 12 Kas · /),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /M\. Yılmaz/ }));
    expect(
      screen.getByRole("region", { name: "Uluslararası Fırsatlar" }),
    ).toBeVisible();
  });

  it("lists every offered time in the picked request's detail", async () => {
    vi.mocked(getStudentAppointments).mockResolvedValue([
      {
        ...alternative,
        alternatives: [
          {
            startsAt: "2026-11-13T07:30:00.000Z",
            endsAt: "2026-11-13T08:00:00.000Z",
          },
          {
            startsAt: "2026-11-16T08:00:00.000Z",
            endsAt: "2026-11-16T08:30:00.000Z",
          },
        ],
      },
    ]);
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Hafta" }));

    const detail = screen.getByRole("region", {
      name: "CV ve yüksek lisans seçenekleri",
    });
    expect(
      within(detail).getByText(/^Önerilen: Cum 13 Kas · .* – /),
    ).toBeVisible();
    expect(
      within(detail).getByText(/^Önerilen: Pzt 16 Kas · .* – /),
    ).toBeVisible();
    expect(
      within(detail).getAllByRole("button", { name: /önerisini kabul et$/ }),
    ).toHaveLength(2);
  });

  it("pages the calendar and goes back to today", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Gün" }));
    expect(
      screen.getByRole("heading", { name: "9 Kasım 2026, Pazartesi" }),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    expect(
      screen.getByRole("heading", { name: "10 Kasım 2026, Salı" }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Bugün" }));
    expect(
      screen.getByRole("heading", { name: "9 Kasım 2026, Pazartesi" }),
    ).toBeVisible();
  });

  it("lists a picked day of the month, with a request on the time offered", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Ay" }));
    expect(screen.getByRole("heading", { name: "Kasım özeti" })).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "12 Kas, 1 randevu" }),
    );
    const day = screen.getByRole("region", { name: "12 Kasım, Perşembe" });
    expect(within(day).getByText(/Z\. Demir/)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "13 Kas, 1 randevu" }),
    );
    const next = screen.getByRole("region", { name: "13 Kasım, Cuma" });
    expect(
      within(next).getByText("10:30 · CV ve yüksek lisans seçenekleri"),
    ).toBeVisible();
    expect(within(next).getByText("A. Kaya · Office Hours")).toBeVisible();
  });

  it("shows the day with the Şu an line while it is today", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Gün" }));
    expect(screen.getByText("Şu an: 12:00")).toBeInTheDocument();

    for (let step = 0; step < 4; step += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    }
    expect(
      screen.getByRole("heading", { name: "13 Kasım 2026, Cuma" }),
    ).toBeVisible();
    expect(screen.queryByText(/^Şu an/)).not.toBeInTheDocument();
    const block = screen.getByRole("button", {
      name: /^10:30 – 11:00 · Prof\. Dr\. Ahmet Kaya · Alternatif Saat Önerildi/,
    });
    expect(block).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("region", { name: "CV ve yüksek lisans seçenekleri" }),
    ).toBeVisible();
  });

  it("sums up what is in view and opens Talepler in the list", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Hafta" }));
    const summary = screen.getByRole("region", { name: "Haftanın özeti" });
    expect(summary).toHaveTextContent("1 yanıt bekleyen talep");
    await userEvent.click(
      within(summary).getByRole("button", { name: "Talepleri listede gör" }),
    );
    expect(screen.getByRole("tab", { name: /Talepler/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens the list on Yaklaşan when nothing in view waits", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Gün" }));
    const summary = screen.getByRole("region", { name: "Günün özeti" });
    await userEvent.click(
      within(summary).getByRole("button", { name: "Tümünü listede gör" }),
    );
    expect(screen.getByRole("tab", { name: /Yaklaşan/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens the month's picked day in the day view", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Ay" }));
    await userEvent.click(
      screen.getByRole("button", { name: "12 Kas, 1 randevu" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Günü aç" }));
    expect(
      screen.getByRole("heading", { name: "12 Kasım 2026, Perşembe" }),
    ).toBeVisible();
  });

  it("explains the colours beside the calendar's title", async () => {
    renderWithQueryClient(<StudentAppointmentsView />);
    await panel();
    await userEvent.click(screen.getByRole("button", { name: "Hafta" }));
    const colours = screen.getByRole("list", { name: "Renkler" });
    expect(within(colours).getAllByRole("listitem")).toHaveLength(3);
  });

  it("offers a way to find a mentor when there are no appointments", async () => {
    vi.mocked(getStudentAppointments).mockResolvedValue([]);
    renderWithQueryClient(<StudentAppointmentsView />);
    expect(await screen.findByText("Henüz randevun yok")).toBeVisible();
    expect(screen.getByRole("link", { name: "Mentor bul" })).toHaveAttribute(
      "href",
      "/student/peer-mentoring",
    );
  });

  it("offers a retry when the list cannot load", async () => {
    vi.mocked(getStudentAppointments).mockRejectedValue(new Error("down"));
    renderWithQueryClient(<StudentAppointmentsView />);
    expect(await screen.findByText("Randevular yüklenemedi.")).toBeVisible();
    vi.mocked(getStudentAppointments).mockResolvedValue([]);
    await userEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(await screen.findByText("Henüz randevun yok")).toBeVisible();
  });
});
