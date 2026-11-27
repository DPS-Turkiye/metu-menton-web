import { describe, expect, it } from "vitest";

import { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import { PROFILE_COMPLETION_CATEGORIES } from "@/lib/client/fixtures/student-profile-completion";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

const subtopics = PROFILE_COMPLETION_CATEGORIES.flatMap(
  (item) => item.subtopics,
);

describe("PROFILE_COMPLETION_CATEGORIES", () => {
  it("lists every peer category once, each with five sub-topics", () => {
    expect(PROFILE_COMPLETION_CATEGORIES.map((item) => item.id)).toEqual(
      expect.arrayContaining(Object.values(PeerTopicCategory)),
    );
    expect(PROFILE_COMPLETION_CATEGORIES).toHaveLength(
      Object.values(PeerTopicCategory).length,
    );
    for (const item of PROFILE_COMPLETION_CATEGORIES) {
      expect(item.subtopics).toHaveLength(5);
    }
  });

  it("gives sub-topics unique ids the backend accepts, within the student limit of 40", () => {
    const ids = subtopics.map((sub) => sub.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(40);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]{1,64}$/);
    }
  });

  it("keeps the ids students and mentors saved before the real sub-topics, in their category", () => {
    const legacy: [PeerTopicCategory, string][] = [
      [PeerTopicCategory.AcademicDevelopment, "fixture-study"],
      [PeerTopicCategory.CareerInternship, "fixture-cv"],
      [PeerTopicCategory.TechnicalDigital, "fixture-code"],
      [PeerTopicCategory.ResearchAcademicCareer, "fixture-methods"],
      [PeerTopicCategory.Entrepreneurship, "fixture-project"],
      [PeerTopicCategory.CampusLife, "fixture-clubs"],
      [PeerTopicCategory.PersonalProfessional, "fixture-time"],
      [PeerTopicCategory.International, "fixture-exchange"],
    ];
    for (const [category, id] of legacy) {
      const item = PROFILE_COMPLETION_CATEGORIES.find(
        (entry) => entry.id === category,
      );
      expect(item?.subtopics.map((sub) => sub.id)).toContain(id);
    }
  });

  it("names each sub-topic in both languages, without the old 'Örnek' placeholder", () => {
    for (const { labelKey } of subtopics) {
      const turkish = tr.studentProfileCompletion.subtopics[labelKey];
      const english = en.studentProfileCompletion.subtopics[labelKey];
      expect(turkish).not.toMatch(/Örnek/);
      expect(english).not.toMatch(/Example/);
      expect(turkish.length).toBeGreaterThan(0);
      expect(english.length).toBeGreaterThan(0);
    }
    expect(Object.keys(tr.studentProfileCompletion.subtopics)).toHaveLength(
      subtopics.length,
    );
  });
});
