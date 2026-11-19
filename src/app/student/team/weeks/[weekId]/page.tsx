import { IskurReviewView } from "@/components/student/iskur/review-view";

export default async function StudentTeamWeekPage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  const { weekId } = await params;
  return (
    <IskurReviewView
      key={weekId}
      reviewer={{ programId: null }}
      weekId={weekId}
    />
  );
}
