import { describe, expect, it } from "vitest";

import { ProgramFeature } from "@/interfaces/program";
import { studentFeatureView } from "@/lib/program-features";
import {
  showsStudentHref,
  STUDENT_OFFICE_HOURS_HREF,
  STUDENT_PEER_MENTORING_HREF,
} from "@/lib/student-features";

describe("showsStudentHref", () => {
  it("hides peer mentoring and Office Hours pages by the semester's features", () => {
    const view = studentFeatureView([]);
    expect(showsStudentHref(STUDENT_PEER_MENTORING_HREF, view)).toBe(false);
    expect(
      showsStudentHref(`${STUDENT_PEER_MENTORING_HREF}?tab=mine`, view),
    ).toBe(false);
    expect(showsStudentHref(STUDENT_OFFICE_HOURS_HREF, view)).toBe(true);
  });

  it("matches the page and what is under it, not a page that only starts alike", () => {
    const view = studentFeatureView([ProgramFeature.PeerMentoring]);
    expect(showsStudentHref(`${STUDENT_OFFICE_HOURS_HREF}/book`, view)).toBe(
      false,
    );
    expect(showsStudentHref(`${STUDENT_OFFICE_HOURS_HREF}#slots`, view)).toBe(
      false,
    );
    expect(showsStudentHref(`${STUDENT_OFFICE_HOURS_HREF}-archive`, view)).toBe(
      true,
    );
  });

  it("always shows the pages no feature owns", () => {
    const view = studentFeatureView([]);
    expect(showsStudentHref("/student", view)).toBe(true);
    expect(showsStudentHref("/student/appointments", view)).toBe(true);
    expect(showsStudentHref("/student/profile", view)).toBe(true);
  });
});
