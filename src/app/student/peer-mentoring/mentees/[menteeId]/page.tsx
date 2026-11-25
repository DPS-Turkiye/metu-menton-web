import { PeerMenteeProfileView } from "@/components/student/peer-mentee-profile";

export default async function StudentPeerMenteePage({
  params,
}: {
  params: Promise<{ menteeId: string }>;
}) {
  const { menteeId } = await params;
  return <PeerMenteeProfileView menteeId={menteeId} />;
}
