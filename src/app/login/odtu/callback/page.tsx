import { Suspense } from "react";

import { OdtuCasCallbackView } from "@/components/login/odtu-cas-callback-view";

export default function OdtuCasCallbackPage() {
  return (
    <Suspense>
      <OdtuCasCallbackView />
    </Suspense>
  );
}
