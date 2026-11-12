import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeHoursCalendarLinks } from "@/components/office-hours/office-hours-calendar-links";
import { OfficeHoursRole } from "@/interfaces/office-hours";
import {
  getCourseCalendarLink,
  getPersonalCalendarLink,
  resetCourseCalendarLink,
  resetPersonalCalendarLink,
} from "@/lib/client/office-hours-calendar";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/office-hours-calendar", () => ({
  getCourseCalendarLink: vi.fn(),
  getPersonalCalendarLink: vi.fn(),
  resetCourseCalendarLink: vi.fn(),
  resetPersonalCalendarLink: vi.fn(),
}));

const PERSONAL_URL =
  "https://menton.test/api/office-hours/calendar/a.ics?lang=tr";
const COURSE_URL =
  "https://menton.test/api/office-hours/calendar/b.ics?lang=tr";

function row(title: string) {
  const item = screen.getByText(title).closest("li");
  if (!item) throw new Error(`No row titled ${title}`);
  return within(item);
}

describe("OfficeHoursCalendarLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPersonalCalendarLink).mockResolvedValue({ url: PERSONAL_URL });
    vi.mocked(getCourseCalendarLink).mockResolvedValue({ url: COURSE_URL });
  });

  it("asks for a link only once the person opens it, since asking makes it", async () => {
    renderWithQueryClient(
      <OfficeHoursCalendarLinks
        courseId="course-1"
        viewer={OfficeHoursRole.Student}
      />,
    );

    expect(getPersonalCalendarLink).not.toHaveBeenCalled();
    expect(getCourseCalendarLink).not.toHaveBeenCalled();

    await userEvent.click(
      row("Görüşmelerim").getByRole("button", { name: "Linki göster" }),
    );

    expect(
      await row("Görüşmelerim").findByLabelText("Takvim linki"),
    ).toHaveValue(PERSONAL_URL);
    expect(getCourseCalendarLink).not.toHaveBeenCalled();
  });

  it("copies the link, and says so when the frame does not allow the clipboard", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <OfficeHoursCalendarLinks
        courseId="course-1"
        viewer={OfficeHoursRole.Student}
      />,
    );
    await user.click(
      row("Görüşmelerim").getByRole("button", { name: "Linki göster" }),
    );
    await row("Görüşmelerim").findByLabelText("Takvim linki");

    await user.click(
      row("Görüşmelerim").getByRole("button", { name: "Kopyala" }),
    );
    expect(await navigator.clipboard.readText()).toBe(PERSONAL_URL);
    expect(row("Görüşmelerim").getByRole("status")).toHaveTextContent(
      "Kopyalandı.",
    );

    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("blocked"),
    );
    await user.click(
      row("Görüşmelerim").getByRole("button", { name: "Kopyala" }),
    );
    expect(row("Görüşmelerim").getByRole("status")).toHaveTextContent(
      "Kopyalanamadı. Linki seçip kendin kopyala.",
    );
  });

  it("lets a student take the course link but not reset it", async () => {
    renderWithQueryClient(
      <OfficeHoursCalendarLinks
        courseId="course-1"
        viewer={OfficeHoursRole.Student}
      />,
    );
    await userEvent.click(
      row("Dersin ofis saatleri").getByRole("button", { name: "Linki göster" }),
    );

    expect(
      await row("Dersin ofis saatleri").findByLabelText("Takvim linki"),
    ).toHaveValue(COURSE_URL);
    expect(getCourseCalendarLink).toHaveBeenCalledWith("course-1");
    expect(
      row("Dersin ofis saatleri").queryByRole("button", {
        name: "Yeni link oluştur",
      }),
    ).not.toBeInTheDocument();
  });

  it("resets the course link for an academic only after they confirm", async () => {
    const newUrl =
      "https://menton.test/api/office-hours/calendar/c.ics?lang=tr";
    vi.mocked(resetCourseCalendarLink).mockResolvedValue({ url: newUrl });
    renderWithQueryClient(
      <OfficeHoursCalendarLinks
        courseId="course-1"
        viewer={OfficeHoursRole.Instructor}
      />,
    );
    const course = row("Dersin ofis saatleri");
    await userEvent.click(course.getByRole("button", { name: "Linki göster" }));
    await course.findByLabelText("Takvim linki");

    await userEvent.click(
      course.getByRole("button", { name: "Yeni link oluştur" }),
    );
    await userEvent.click(course.getByRole("button", { name: "Vazgeç" }));
    expect(resetCourseCalendarLink).not.toHaveBeenCalled();

    await userEvent.click(
      course.getByRole("button", { name: "Yeni link oluştur" }),
    );
    await userEvent.click(course.getByRole("button", { name: "Evet, yenile" }));

    expect(await course.findByDisplayValue(newUrl)).toBeInTheDocument();
    expect(resetCourseCalendarLink).toHaveBeenCalledWith("course-1");
    expect(resetPersonalCalendarLink).not.toHaveBeenCalled();
  });

  it("offers a retry when the link can't be loaded", async () => {
    vi.mocked(getPersonalCalendarLink).mockRejectedValueOnce(new Error("down"));
    renderWithQueryClient(
      <OfficeHoursCalendarLinks
        courseId="course-1"
        viewer={OfficeHoursRole.Student}
      />,
    );
    await userEvent.click(
      row("Görüşmelerim").getByRole("button", { name: "Linki göster" }),
    );

    expect(await row("Görüşmelerim").findByRole("alert")).toHaveTextContent(
      "Link alınamadı.",
    );
    await userEvent.click(
      row("Görüşmelerim").getByRole("button", { name: "Tekrar dene" }),
    );
    expect(
      await row("Görüşmelerim").findByLabelText("Takvim linki"),
    ).toHaveValue(PERSONAL_URL);
  });
});
