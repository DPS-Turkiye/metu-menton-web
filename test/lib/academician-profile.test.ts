import { describe, expect, it } from "vitest";

import {
  emptyCourseRow,
  emptyTopicRow,
  hasProfileErrors,
  isPlainText,
  RESPONSE_DAY_OPTIONS,
  tagError,
  toProfileForm,
  toProfilePayload,
  validateProfileForm,
} from "@/lib/academician-profile";
import { ProfileFormError, ProfileTagError } from "@/types/academician-profile";
import { officeHoursProfile } from "@test/fixtures/office-hours-me";

const PROFILE = officeHoursProfile({
  details: {
    about: "Hakkımda",
    topics: [{ title: "Staj", body: null }],
    courses: [{ code: "CENG 140", name: "C" }],
    expertise: ["ML"],
    responseDays: 2,
  },
});

describe("isPlainText", () => {
  it("lets a lone < through and stops anything that opens a tag", () => {
    expect(isPlainText("ortalaması < 2")).toBe(true);
    expect(isPlainText("<b>")).toBe(false);
    expect(isPlainText("</p>")).toBe(false);
    expect(isPlainText("<!-- x -->")).toBe(false);
  });
});

describe("toProfileForm / toProfilePayload", () => {
  it("round-trips a saved profile unchanged", () => {
    expect(toProfilePayload(toProfileForm(PROFILE))).toEqual(PROFILE);
  });

  it("gives every row its own key and empty text for a missing line", () => {
    const form = toProfileForm(
      officeHoursProfile({
        details: {
          ...PROFILE.details,
          topics: [
            { title: "A", body: null },
            { title: "B", body: "b" },
          ],
        },
      }),
    );
    const [first, second] = form.topics;
    expect(first?.body).toBe("");
    expect(first?.key).not.toBe(second?.key);
    expect(form.responseDays).toBe("2");
  });

  it("trims, clears empty fields and drops rows left blank", () => {
    const form = toProfileForm(PROFILE);
    const payload = toProfilePayload({
      ...form,
      defaultPlace: "  ",
      about: "",
      responseDays: "",
      topics: [...form.topics, emptyTopicRow()],
      courses: [{ ...emptyCourseRow(), code: " CENG 111 ", name: " Giriş " }],
    });
    expect(payload.defaultPlace).toBeNull();
    expect(payload.details).toEqual({
      about: null,
      topics: [{ title: "Staj", body: null }],
      courses: [{ code: "CENG 111", name: "Giriş" }],
      expertise: ["ML"],
      responseDays: null,
    });
  });
});

describe("validateProfileForm", () => {
  it("finds nothing wrong in a saved profile", () => {
    expect(hasProfileErrors(validateProfileForm(toProfileForm(PROFILE)))).toBe(
      false,
    );
  });

  it("names each problem by field and row", () => {
    const form = toProfileForm(PROFILE);
    const topic = { ...emptyTopicRow(), body: "only a line" };
    const course = { ...emptyCourseRow(), code: "CENG 140" };
    const markup = { ...emptyTopicRow(), title: "<script>" };
    const errors = validateProfileForm({
      ...form,
      onlineLink: "javascript:alert(1)",
      contactEmail: "ayse@",
      about: "<b>hi</b>",
      topics: [topic, markup, emptyTopicRow()],
      courses: [course],
    });
    expect(errors).toEqual({
      onlineLink: ProfileFormError.InvalidLink,
      contactEmail: ProfileFormError.InvalidEmail,
      about: ProfileFormError.Markup,
      topics: {
        [topic.key]: ProfileFormError.TopicTitleMissing,
        [markup.key]: ProfileFormError.Markup,
      },
      courses: { [course.key]: ProfileFormError.CourseIncomplete },
    });
    expect(hasProfileErrors(errors)).toBe(true);
  });
});

describe("tagError", () => {
  it("says why a tag can't be added", () => {
    expect(tagError([], "  ")).toBe(ProfileTagError.Empty);
    expect(tagError([], "<i>")).toBe(ProfileTagError.Markup);
    expect(tagError(["İstatistik"], "istatistik")).toBe(
      ProfileTagError.Duplicate,
    );
    expect(tagError(["Bilgisayarlı görü"], "BILGISAYARLI GÖRÜ")).toBe(
      ProfileTagError.Duplicate,
    );
    expect(tagError(["Bilgisayarlı görü"], "bilgisayarli goru")).toBeNull();
    expect(tagError(["a", "b", "c", "d", "e"], "f")).toBe(ProfileTagError.Full);
    expect(tagError(["a"], "b")).toBeNull();
  });
});

it("offers 1 to 14 days, as the backend accepts", () => {
  expect(RESPONSE_DAY_OPTIONS[0]).toBe(1);
  expect(RESPONSE_DAY_OPTIONS.at(-1)).toBe(14);
  expect(RESPONSE_DAY_OPTIONS).toHaveLength(14);
});
