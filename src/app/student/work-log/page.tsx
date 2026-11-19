import { Suspense } from "react";

import { IskurWorkLogView } from "@/components/student/iskur/work-log-view";

export default function StudentWorkLogPage() {
  // The view reads its week and day from the URL.
  return (
    <Suspense>
      <IskurWorkLogView />
    </Suspense>
  );
}
