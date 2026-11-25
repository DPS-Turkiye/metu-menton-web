import type { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";

/** What a piece of a peer mentor's evidence is; mirrors the backend's PeerEvidenceType. A portfolio is a link. */
export enum PeerEvidenceType {
  Transcript = "TRANSCRIPT",
  Cv = "CV",
  Certificate = "CERTIFICATE",
  Portfolio = "PORTFOLIO",
  ReferenceLetter = "REFERENCE_LETTER",
  Award = "AWARD",
  Volunteering = "VOLUNTEERING",
  ProjectReport = "PROJECT_REPORT",
}

/**
 * Who besides the mentor sees it: their program's coordinators always (to verify it); with Profile also the students
 * of that program, on the mentor's profile.
 */
export enum PeerDocumentVisibility {
  VerificationOnly = "VERIFICATION_ONLY",
  Profile = "PROFILE",
}

/** A file (name, type, size) or, for a portfolio, a link (url); the other side's fields are null. */
export type PeerMentorDocument = {
  id: string;
  evidenceType: PeerEvidenceType;
  visibility: PeerDocumentVisibility;
  url: string | null;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

/** A file the mentor gave with their İŞKUR form (`GET …/profile/form-documents`), to use instead of uploading again. */
export type PeerMentorFormDocument = {
  slot: IskurDocumentSlot;
  originalFilename: string;
  sizeBytes: number;
};

export type UsePeerMentorFormDocumentInput = {
  slot: IskurDocumentSlot;
  visibility: PeerDocumentVisibility;
};

export type AddPeerMentorLinkInput = {
  url: string;
  visibility: PeerDocumentVisibility;
};

export type UpdatePeerMentorDocumentInput = {
  visibility: PeerDocumentVisibility;
};
