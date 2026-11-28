import {
  OFFICE_HOURS_PROFILE_LIMITS,
  type OfficeHoursProfile,
} from "@/interfaces/office-hours-me";
import { withKey, withKeys } from "@/lib/keyed-list";
import { isEmailAddress, typedUrlOrNull } from "@/lib/utils";
import {
  ProfileFormError,
  ProfileTagError,
  type AcademicianProfileErrors,
  type AcademicianProfileForm,
  type ProfileCourseRow,
  type ProfileTopicRow,
} from "@/types/academician-profile";

/** The backend's plain-text rule: a lone "<" ("ortalaması < 2") is fine, anything that opens a tag is not. */
export function isPlainText(value: string) {
  return !/<[A-Za-z/!?]/.test(value);
}

function optional(value: string) {
  return value.trim() || null;
}

export function toProfileForm(
  profile: OfficeHoursProfile,
): AcademicianProfileForm {
  const { details } = profile;
  return {
    listed: profile.listed,
    defaultPlace: profile.defaultPlace ?? "",
    onlineLink: profile.onlineLink ?? "",
    contactEmail: profile.contactEmail ?? "",
    about: details.about ?? "",
    responseDays: details.responseDays ? String(details.responseDays) : "",
    topics: withKeys(
      details.topics.map((topic) => ({
        title: topic.title,
        body: topic.body ?? "",
      })),
    ),
    courses: withKeys(details.courses),
    expertise: [...details.expertise],
    emails: { ...profile.emails },
  };
}

export function emptyTopicRow(): ProfileTopicRow {
  return withKey({ title: "", body: "" });
}

export function emptyCourseRow(): ProfileCourseRow {
  return withKey({ code: "", name: "" });
}

function isBlankTopic(row: ProfileTopicRow) {
  return !row.title.trim() && !row.body.trim();
}

function isBlankCourse(row: ProfileCourseRow) {
  return !row.code.trim() && !row.name.trim();
}

function topicError(row: ProfileTopicRow): ProfileFormError | null {
  if (!isPlainText(row.title) || !isPlainText(row.body)) {
    return ProfileFormError.Markup;
  }
  if (!row.title.trim()) return ProfileFormError.TopicTitleMissing;
  return null;
}

function courseError(row: ProfileCourseRow): ProfileFormError | null {
  if (!isPlainText(row.code) || !isPlainText(row.name)) {
    return ProfileFormError.Markup;
  }
  if (!row.code.trim() || !row.name.trim()) {
    return ProfileFormError.CourseIncomplete;
  }
  return null;
}

function rowErrors<R extends { key: string }>(
  rows: R[],
  isBlank: (row: R) => boolean,
  check: (row: R) => ProfileFormError | null,
) {
  const errors: Record<string, ProfileFormError> = {};
  for (const row of rows) {
    // A row added and left empty is dropped on save, not an error.
    if (isBlank(row)) continue;
    const error = check(row);
    if (error) errors[row.key] = error;
  }
  return errors;
}

/** What stops the form from being saved, by field; an empty result means it can be. */
export function validateProfileForm(
  form: AcademicianProfileForm,
): AcademicianProfileErrors {
  const errors: AcademicianProfileErrors = {
    topics: rowErrors(form.topics, isBlankTopic, topicError),
    courses: rowErrors(form.courses, isBlankCourse, courseError),
  };
  if (form.onlineLink.trim() && !typedUrlOrNull(form.onlineLink)) {
    errors.onlineLink = ProfileFormError.InvalidLink;
  }
  if (form.contactEmail.trim() && !isEmailAddress(form.contactEmail)) {
    errors.contactEmail = ProfileFormError.InvalidEmail;
  }
  if (!isPlainText(form.about)) errors.about = ProfileFormError.Markup;
  return errors;
}

export function hasProfileErrors(errors: AcademicianProfileErrors) {
  return Boolean(
    errors.onlineLink ||
    errors.contactEmail ||
    errors.about ||
    Object.keys(errors.topics).length ||
    Object.keys(errors.courses).length,
  );
}

/** The whole profile as the backend saves it: both groups are sent, so what was cleared here is cleared there. */
export function toProfilePayload(
  form: AcademicianProfileForm,
): OfficeHoursProfile {
  return {
    listed: form.listed,
    defaultPlace: optional(form.defaultPlace),
    onlineLink: typedUrlOrNull(form.onlineLink),
    contactEmail: optional(form.contactEmail),
    details: {
      about: optional(form.about),
      topics: form.topics
        .filter((row) => !isBlankTopic(row))
        .map((row) => ({
          title: row.title.trim(),
          body: optional(row.body),
        })),
      courses: form.courses
        .filter((row) => !isBlankCourse(row))
        .map((row) => ({ code: row.code.trim(), name: row.name.trim() })),
      expertise: form.expertise,
      responseDays: form.responseDays ? Number(form.responseDays) : null,
    },
    emails: form.emails,
  };
}

// People type Turkish words with or without the dotless letters ("BILGISAYARLI" for "Bilgisayarlı"), so the four
// i's count as one letter when tags are compared.
function tagKey(tag: string) {
  return tag.toLocaleLowerCase("tr").replaceAll("ı", "i");
}

/** Why `tag` can't join `tags`, or null when it can. Compared without case, so a near-copy is not added twice. */
export function tagError(tags: string[], tag: string): ProfileTagError | null {
  const trimmed = tag.trim();
  if (!trimmed) return ProfileTagError.Empty;
  if (!isPlainText(trimmed)) return ProfileTagError.Markup;
  const key = tagKey(trimmed);
  if (tags.some((existing) => tagKey(existing) === key)) {
    return ProfileTagError.Duplicate;
  }
  if (tags.length >= OFFICE_HOURS_PROFILE_LIMITS.tags) {
    return ProfileTagError.Full;
  }
  return null;
}

/** The response-time choices the backend accepts: 1 to 14 days. */
export const RESPONSE_DAY_OPTIONS = Array.from(
  { length: OFFICE_HOURS_PROFILE_LIMITS.responseDays },
  (_, index) => index + 1,
);
