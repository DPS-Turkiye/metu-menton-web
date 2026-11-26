import type { StudentFeatureView } from "@/lib/program-features";

export const STUDENT_PEER_MENTORING_HREF = "/student/peer-mentoring";
export const STUDENT_OFFICE_HOURS_HREF = "/student/office-hours";

/** Whether the address is the page or one under it (a sub-page, a query or a fragment). */
function isUnder(href: string, page: string) {
  if (!href.startsWith(page)) return false;
  const next = href.charAt(page.length);
  return next === "" || next === "/" || next === "?" || next === "#";
}

/** Whether the student sees a page by its address: peer mentoring and Office Hours follow the semester's features. */
export function showsStudentHref(href: string, view: StudentFeatureView) {
  if (isUnder(href, STUDENT_PEER_MENTORING_HREF)) return view.peerMentoring;
  if (isUnder(href, STUDENT_OFFICE_HOURS_HREF)) return view.officeHours;
  return true;
}
