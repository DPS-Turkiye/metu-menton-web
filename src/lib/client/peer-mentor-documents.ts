import type {
  AddPeerMentorLinkInput,
  PeerDocumentVisibility,
  PeerEvidenceType,
  PeerMentorDocument,
  PeerMentorFormDocument,
  UsePeerMentorFormDocumentInput,
} from "@/interfaces/peer-mentor-documents";
import { ClientApiError, requireSuccess } from "@/lib/client/api";
import { httpClient, UPLOAD_TIMEOUT_MS } from "@/lib/http-client";

const PROFILE_DOCUMENTS = "/api/peer-mentoring/profile/documents";
const FORM_DOCUMENTS = "/api/peer-mentoring/profile/form-documents";

function documentUrl(documentId: string) {
  return `${PROFILE_DOCUMENTS}/${encodeURIComponent(documentId)}`;
}

export async function getOwnPeerMentorDocuments(): Promise<
  PeerMentorDocument[]
> {
  return requireSuccess(
    await httpClient.get<PeerMentorDocument[]>(PROFILE_DOCUMENTS),
  );
}

export async function uploadPeerMentorDocument(
  file: File,
  evidenceType: PeerEvidenceType,
  visibility: PeerDocumentVisibility,
): Promise<PeerMentorDocument> {
  const data = new FormData();
  data.set("file", file);
  data.set("evidenceType", evidenceType);
  data.set("visibility", visibility);
  return requireSuccess(
    await httpClient.post<PeerMentorDocument>(PROFILE_DOCUMENTS, data, {
      timeout: UPLOAD_TIMEOUT_MS,
    }),
  );
}

export async function getPeerMentorFormDocuments(): Promise<
  PeerMentorFormDocument[]
> {
  return requireSuccess(
    await httpClient.get<PeerMentorFormDocument[]>(FORM_DOCUMENTS),
  );
}

export async function addPeerMentorFormDocument(
  input: UsePeerMentorFormDocumentInput,
): Promise<PeerMentorDocument> {
  return requireSuccess(
    await httpClient.post<PeerMentorDocument>(FORM_DOCUMENTS, input, {
      timeout: UPLOAD_TIMEOUT_MS,
    }),
  );
}

export async function addPeerMentorLink(
  input: AddPeerMentorLinkInput,
): Promise<PeerMentorDocument> {
  return requireSuccess(
    await httpClient.post<PeerMentorDocument>(
      "/api/peer-mentoring/profile/links",
      input,
    ),
  );
}

export async function updatePeerMentorDocumentVisibility(
  documentId: string,
  visibility: PeerDocumentVisibility,
): Promise<PeerMentorDocument> {
  return requireSuccess(
    await httpClient.patch<PeerMentorDocument>(documentUrl(documentId), {
      visibility,
    }),
  );
}

export async function deletePeerMentorDocument(
  documentId: string,
): Promise<void> {
  requireSuccess(await httpClient.delete<null>(documentUrl(documentId)));
}

/** What the student may see of a mentor's evidence: nothing (an empty list) when the backend says 404. */
export async function getPeerMentorDocuments(
  mentorId: string,
): Promise<PeerMentorDocument[]> {
  try {
    return requireSuccess(
      await httpClient.get<PeerMentorDocument[]>(
        `/api/peer-mentoring/mentors/${encodeURIComponent(mentorId)}/documents`,
      ),
    );
  } catch (error) {
    if (error instanceof ClientApiError && error.status === 404) return [];
    throw error;
  }
}

/** Where "Görüntüle" opens a file: the app's own route, which checks the session and streams it. */
export function peerMentorDocumentContentHref(documentId: string) {
  return `/api/peer-mentoring/documents/${encodeURIComponent(documentId)}/content`;
}
