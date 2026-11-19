import { IskurTeamReveal } from "@/components/iskur/team-reveal";
import { IskurHomeView } from "@/components/student/iskur-home-view";

export default function StudentHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <IskurTeamReveal />
      <IskurHomeView />
    </div>
  );
}
