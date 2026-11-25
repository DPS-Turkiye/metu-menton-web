/** The hocam landing's sections in page order; the header's progress marks follow them. */
export const ODTU_LANDING_SECTIONS = [
  { id: "baslangic", key: "start" },
  { id: "akran-mentorluk", key: "peer" },
  { id: "office-hours", key: "officeHours" },
  { id: "konular", key: "topics" },
  { id: "mentor-ol", key: "mentor" },
  { id: "karsilikli", key: "community" },
  { id: "sss", key: "faq" },
] as const;

export const ODTU_LANDING_TOPICS = [
  { key: "career", image: "/ia/landing/career.webp" },
  { key: "technical", image: "/ia/landing/technical.webp" },
  { key: "academic", image: "/ia/landing/academic.webp" },
  { key: "campus", image: "/ia/landing/campus.webp" },
] as const;

export const ODTU_LANDING_STEPS = ["first", "second", "third"] as const;

export const ODTU_LANDING_QUESTIONS = [
  "what",
  "peer",
  "officeHours",
  "otherAdvisor",
  "afterRequest",
  "becomeMentor",
  "where",
] as const;
