import type { AdviseeProfile } from "@/interfaces/institution";
import type { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import type {
  ProfileCompletionCategory,
  StudentProfileCompletion,
} from "@/interfaces/student-profile-completion";
import { PROFILE_COMPLETION_CATEGORIES } from "@/lib/client/fixtures/student-profile-completion";

type Interests = Pick<StudentProfileCompletion, "topics" | "subtopics">;

/** Adds or removes a topic; removing one drops the sub-topics that belong to it. */
export function toggleInterestTopic<T extends Interests>(
  current: T,
  id: PeerTopicCategory,
  categories: ProfileCompletionCategory[],
): T {
  const topics = current.topics.includes(id)
    ? current.topics.filter((value) => value !== id)
    : [...current.topics, id];
  const valid = categories
    .filter((item) => topics.includes(item.id))
    .flatMap((item) => item.subtopics.map((subtopic) => subtopic.id));
  return {
    ...current,
    topics,
    subtopics: current.subtopics.filter((value) => valid.includes(value)),
  };
}

/** Adds or removes a sub-topic; an addition past `max` leaves the choice as it was. */
export function toggleInterestSubtopic<T extends Interests>(
  current: T,
  id: string,
  max = Number.POSITIVE_INFINITY,
): T {
  if (!current.subtopics.includes(id) && current.subtopics.length >= max) {
    return current;
  }
  return {
    ...current,
    subtopics: current.subtopics.includes(id)
      ? current.subtopics.filter((value) => value !== id)
      : [...current.subtopics, id],
  };
}

/** The categories the student picked, in catalogue order, with their sub-topics. */
export function chosenCategories(
  categories: ProfileCompletionCategory[],
  topics: readonly PeerTopicCategory[],
) {
  return categories.filter((item) => topics.includes(item.id));
}

/** The picked sub-topics with their labels, in the order of their categories; ids the catalogue lacks drop out. */
export function chosenSubtopics(
  categories: ProfileCompletionCategory[],
  interests: Interests,
) {
  return chosenCategories(categories, interests.topics)
    .flatMap((item) => item.subtopics)
    .filter((sub) => interests.subtopics.includes(sub.id));
}

/** The catalogue narrowed to a program's active categories, in the catalogue's order. */
export function activeCatalogue(
  catalogue: readonly ProfileCompletionCategory[],
  active: readonly PeerTopicCategory[],
): ProfileCompletionCategory[] {
  return catalogue.filter((item) => active.includes(item.id));
}

/**
 * A student's interests and goal as an advisor or a peer mentor reads them, labelled the way the student's own
 * Profilim labels them. The backend already keeps only topics active in the student's program, so the whole
 * catalogue is enough here.
 */
export function sharedInterests(profile: AdviseeProfile | null) {
  const interests = profile?.interests ?? { topics: [], subtopics: [] };
  const topics = chosenCategories(
    PROFILE_COMPLETION_CATEGORIES,
    interests.topics,
  ).map((item) => item.id);
  const goal = profile?.goal.trim() ?? "";
  return {
    topics,
    subtopics: chosenSubtopics(PROFILE_COMPLETION_CATEGORIES, interests),
    goal,
    isEmpty: topics.length === 0 && goal === "",
  };
}
