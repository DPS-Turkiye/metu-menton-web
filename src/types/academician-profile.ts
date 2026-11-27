import type {
  OfficeHoursCourse,
  OfficeHoursProfileEmails,
} from "@/interfaces/office-hours-me";
import type { Keyed } from "@/lib/keyed-list";

/** A topic row while it is edited: the line under the title is text, empty until written. */
export type ProfileTopicRow = Keyed<{ title: string; body: string }>;

export type ProfileCourseRow = Keyed<OfficeHoursCourse>;

/** Profilim's form: every field as the inputs hold it; `responseDays` is "" when not said. */
export type AcademicianProfileForm = {
  listed: boolean;
  defaultPlace: string;
  onlineLink: string;
  contactEmail: string;
  about: string;
  responseDays: string;
  topics: ProfileTopicRow[];
  courses: ProfileCourseRow[];
  expertise: string[];
  emails: OfficeHoursProfileEmails;
};

export type ProfileTextField =
  "defaultPlace" | "onlineLink" | "contactEmail" | "about" | "responseDays";

export enum ProfileFormError {
  InvalidLink = "invalidLink",
  InvalidEmail = "invalidEmail",
  Markup = "markup",
  TopicTitleMissing = "topicTitleMissing",
  CourseIncomplete = "courseIncomplete",
}

/** Why a tag was not added; `null` from the check means it can be. */
export enum ProfileTagError {
  Empty = "tagEmpty",
  Duplicate = "tagDuplicate",
  Full = "tagFull",
  Markup = "markup",
}

export type AcademicianProfileErrors = {
  onlineLink?: ProfileFormError | undefined;
  contactEmail?: ProfileFormError | undefined;
  about?: ProfileFormError | undefined;
  /** By row key. */
  topics: Record<string, ProfileFormError>;
  courses: Record<string, ProfileFormError>;
};
