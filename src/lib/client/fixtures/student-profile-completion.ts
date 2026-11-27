import { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import type {
  ProfileCompletionCategory,
  StudentProfileCompletion,
} from "@/interfaces/student-profile-completion";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
// Sub-topics: Figma's revised flows name Kariyer, Teknik and Akademik; the other five are proposed until the board
// confirms them. The legacy `fixture-*` ids stay on the closest sub-topic so saved student and mentor choices,
// and the matching between them, survive the rename.
export const PROFILE_COMPLETION_CATEGORIES: ProfileCompletionCategory[] = [
  {
    id: PeerTopicCategory.AcademicDevelopment,
    subtopics: [
      { id: "course-selection", labelKey: "courseSelection" },
      { id: "double-major-minor", labelKey: "doubleMajorMinor" },
      { id: "exam-preparation", labelKey: "examPreparation" },
      { id: "fixture-study", labelKey: "study" },
      { id: "summer-school", labelKey: "summerSchool" },
    ],
  },
  {
    id: PeerTopicCategory.CareerInternship,
    subtopics: [
      { id: "fixture-cv", labelKey: "cv" },
      { id: "internship-application", labelKey: "internshipApplication" },
      { id: "interview-preparation", labelKey: "interviewPreparation" },
      { id: "sector-choice", labelKey: "sectorChoice" },
      { id: "linkedin-profile", labelKey: "linkedinProfile" },
    ],
  },
  {
    id: PeerTopicCategory.TechnicalDigital,
    subtopics: [
      { id: "fixture-code", labelKey: "code" },
      { id: "data-analysis", labelKey: "dataAnalysis" },
      { id: "excel", labelKey: "excel" },
      { id: "design-tools", labelKey: "designTools" },
      { id: "web-development", labelKey: "webDevelopment" },
    ],
  },
  {
    id: PeerTopicCategory.ResearchAcademicCareer,
    subtopics: [
      { id: "fixture-methods", labelKey: "methods" },
      { id: "undergraduate-research", labelKey: "undergraduateResearch" },
      { id: "academic-writing", labelKey: "academicWriting" },
      { id: "graduate-application", labelKey: "graduateApplication" },
      { id: "conferences-publications", labelKey: "conferencesPublications" },
    ],
  },
  {
    id: PeerTopicCategory.Entrepreneurship,
    subtopics: [
      { id: "fixture-project", labelKey: "project" },
      { id: "business-model", labelKey: "businessModel" },
      { id: "team-building", labelKey: "teamBuilding" },
      { id: "pitching", labelKey: "pitching" },
      { id: "competitions-accelerators", labelKey: "competitionsAccelerators" },
    ],
  },
  {
    id: PeerTopicCategory.CampusLife,
    subtopics: [
      { id: "fixture-clubs", labelKey: "clubs" },
      { id: "campus-adaptation", labelKey: "campusAdaptation" },
      { id: "dorms-housing", labelKey: "dormsHousing" },
      { id: "scholarships-support", labelKey: "scholarshipsSupport" },
      { id: "campus-facilities", labelKey: "campusFacilities" },
    ],
  },
  {
    id: PeerTopicCategory.PersonalProfessional,
    subtopics: [
      { id: "fixture-time", labelKey: "time" },
      { id: "communication", labelKey: "communication" },
      { id: "presentation-skills", labelKey: "presentationSkills" },
      { id: "motivation-stress", labelKey: "motivationStress" },
      { id: "teamwork", labelKey: "teamwork" },
    ],
  },
  {
    id: PeerTopicCategory.International,
    subtopics: [
      { id: "fixture-exchange", labelKey: "exchange" },
      { id: "internship-abroad", labelKey: "internshipAbroad" },
      { id: "graduate-abroad", labelKey: "graduateAbroad" },
      { id: "language-exams", labelKey: "languageExams" },
      {
        id: "international-scholarships",
        labelKey: "internationalScholarships",
      },
    ],
  },
];

export const EMPTY_PROFILE_COMPLETION: StudentProfileCompletion = {
  topics: [],
  subtopics: [],
  goal: "",
  completed: false,
  skipped: false,
};
