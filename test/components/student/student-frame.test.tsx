import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcademicianFrame } from "@/components/academician/academician-frame";
import { StudentFrame } from "@/components/student/student-frame";
import { Edition } from "@/interfaces/edition";
import { ProgramFeature } from "@/interfaces/program";
import { IdentityKind, UserRole, type AppSession } from "@/interfaces/session";
import { getMyProgramFeatures } from "@/lib/client/program-features";
import { itemAt } from "@test/fixtures/list-assertions";
import { renderWithQueryClient } from "@test/test-utils";

const replace = vi.fn();
let pathname = "/student";
const odtuStudent: AppSession = {
  userId: "u1",
  fullName: "Ayşe Yılmaz",
  email: "ayse.yilmaz@odtu-dev.invalid",
  role: UserRole.Mentee,
  jobTitle: "",
  permissions: [UserRole.Mentee],
  institutionKinds: [IdentityKind.Student],
  edition: Edition.Odtu,
};
const teknokentMentee: AppSession = {
  userId: "u2",
  fullName: "Kurucu",
  email: "kurucu@example.com",
  role: UserRole.Mentee,
  jobTitle: "",
  organizationId: "org-1",
  permissions: [UserRole.Mentee],
};
const researchAssistant: AppSession = {
  userId: "u3",
  fullName: "Elif Şahin",
  email: "elif.sahin@odtu-dev.invalid",
  role: UserRole.Academician,
  jobTitle: "",
  permissions: [UserRole.Mentee, UserRole.Academician],
  institutionKinds: [IdentityKind.Student, IdentityKind.Academic],
  edition: Edition.Odtu,
};
let session: AppSession = odtuStudent;
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));
vi.mock("@/components/providers/session-provider", () => ({
  useAppSession: () => session,
  useSession: () => ({ session, isLoading: false, logout: vi.fn() }),
}));
vi.mock("@/components/common/notification-menu", () => ({
  NotificationMenu: ({ hrefFor }: { hrefFor?: (href: string) => string }) => (
    <a href={hrefFor?.("/mentor-request/status?request=r1")}>Bildirim</a>
  ),
}));
vi.mock("@/components/iskur/iskur-messages-menu", () => ({
  IskurMessagesMenu: () => <button type="button">İŞKUR Mesajlar</button>,
}));
vi.mock("@/lib/client/program-features", () => ({
  getMyProgramFeatures: vi.fn(),
}));
// The tour has its own tests (test/components/product-tour); here it would only open over the menus.
vi.mock("@/components/product-tour/product-tour", () => ({
  ProductTour: () => null,
}));

function desktopNav(name: string) {
  return itemAt(screen.getAllByRole("navigation", { name }), 0);
}

beforeEach(() => {
  session = odtuStudent;
  replace.mockClear();
  vi.mocked(getMyProgramFeatures).mockResolvedValue([
    ProgramFeature.PeerMentoring,
    ProgramFeature.OfficeHours,
    ProgramFeature.Iskur,
  ]);
});

describe("StudentFrame", () => {
  it("shows the student menu with the screens that have landed open", () => {
    pathname = "/student";
    renderWithQueryClient(
      <StudentFrame>
        <p>Ana içerik</p>
      </StudentFrame>,
    );
    expect(
      screen.getByRole("button", { name: "İŞKUR Mesajlar" }),
    ).toBeInTheDocument();
    const nav = desktopNav("Öğrenci menüsü");
    expect(
      within(nav).getByRole("link", { name: "Ana Sayfa" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Akran Mentörlüğü" }),
    ).toHaveAttribute("href", "/student/peer-mentoring");
    expect(within(nav).getByRole("link", { name: "Profilim" })).toHaveAttribute(
      "href",
      "/student/profile",
    );
    const officeHours = within(nav).getByRole("link", {
      name: "Office Hours",
    });
    expect(officeHours).toHaveAttribute("href", "/student/office-hours");
    expect(
      within(nav).getByRole("link", { name: "Randevularım" }),
    ).toHaveAttribute("href", "/student/appointments");
    expect(screen.getByText("Ana içerik")).toBeInTheDocument();
  });

  it("hides Office Hours when the student's semester has it switched off", async () => {
    pathname = "/student";
    vi.mocked(getMyProgramFeatures).mockResolvedValue([
      ProgramFeature.PeerMentoring,
    ]);
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    const nav = desktopNav("Öğrenci menüsü");
    await waitFor(() =>
      expect(
        within(nav).queryByRole("link", { name: "Office Hours" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(nav).getByRole("link", { name: "Akran Mentörlüğü" }),
    ).toBeInTheDocument();
  });

  it("keeps Office Hours but not peer mentoring for a student in no semester", async () => {
    pathname = "/student";
    vi.mocked(getMyProgramFeatures).mockResolvedValue([]);
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    const nav = desktopNav("Öğrenci menüsü");
    await waitFor(() =>
      expect(
        within(nav).queryByRole("link", { name: "Akran Mentörlüğü" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(nav).getByRole("link", { name: "Office Hours" }),
    ).toBeInTheDocument();
  });

  it("hides nothing while the features cannot be read", async () => {
    pathname = "/student";
    vi.mocked(getMyProgramFeatures).mockRejectedValue(new Error("down"));
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    await waitFor(() => expect(getMyProgramFeatures).toHaveBeenCalled());
    const nav = desktopNav("Öğrenci menüsü");
    expect(
      within(nav).getByRole("link", { name: "Akran Mentörlüğü" }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Office Hours" }),
    ).toBeInTheDocument();
  });

  it("opens a peer mentoring notification inside the student workspace", () => {
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    expect(screen.getByRole("link", { name: "Bildirim" })).toHaveAttribute(
      "href",
      "/student/peer-mentoring?tab=mine",
    );
  });

  it("names the workspace, not the account's role, under the user's name", () => {
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    expect(
      screen.getByRole("button", { name: "Ayşe Yılmaz, Öğrenci" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Girişim Ekibi")).toBeNull();
  });

  it("opens Profilim from the account menu", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    await user.click(screen.getByRole("button", { name: /Ayşe Yılmaz/ }));
    expect(screen.getByRole("menuitem", { name: "Profilim" })).toHaveAttribute(
      "href",
      "/student/profile",
    );
  });

  it("opens for an ODTÜ student", () => {
    renderWithQueryClient(<StudentFrame>x</StudentFrame>);
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends a Teknokent mentee to their own home instead", () => {
    session = teknokentMentee;
    renderWithQueryClient(<StudentFrame>İçerik</StudentFrame>);
    expect(screen.queryByText("İçerik")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("opens for a research assistant, who is a student too", () => {
    session = researchAssistant;
    renderWithQueryClient(<StudentFrame>İçerik</StudentFrame>);
    expect(screen.getByText("İçerik")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

const ACADEMICIAN_SCREENS_BUILT = [
  "Randevularım",
  "Danışan Öğrencilerim",
  "Profilim",
];
// The IA redesign folds Talepler and Takvim into Randevularım.
const ACADEMICIAN_SCREENS_GONE = ["Randevu Talepleri", "Takvim"];

describe("AcademicianFrame", () => {
  it("does not open for a student who is not an academician", () => {
    pathname = "/academician";
    renderWithQueryClient(<AcademicianFrame>İçerik</AcademicianFrame>);
    expect(screen.queryByText("İçerik")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/student");
  });

  it("shows the academician menu with the screens built so far", () => {
    session = researchAssistant;
    pathname = "/academician";
    renderWithQueryClient(<AcademicianFrame>x</AcademicianFrame>);
    const nav = desktopNav("Akademisyen menüsü");
    expect(
      within(nav).getByRole("link", { name: "Ana Sayfa" }),
    ).toHaveAttribute("aria-current", "page");
    for (const label of ACADEMICIAN_SCREENS_BUILT) {
      expect(within(nav).getByRole("link", { name: label })).toBeVisible();
    }
    for (const label of ACADEMICIAN_SCREENS_GONE) {
      expect(within(nav).queryByRole("link", { name: label })).toBeNull();
    }
    expect(
      screen.getByRole("button", { name: /, Akademisyen$/ }),
    ).toBeInTheDocument();
  });
});
