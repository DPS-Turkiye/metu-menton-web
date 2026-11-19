import { connection } from "next/server";
import { Suspense } from "react";

import { SignupFlow } from "@/components/signup/signup-flow";
import { StudentSignupFlow } from "@/components/signup/student-signup-flow";
import { Edition } from "@/interfaces/edition";
import { appEdition } from "@/lib/server/edition";

export default async function SignupPage() {
  // Read per request: a prerendered page would freeze the edition the build ran with.
  await connection();
  const edition = appEdition();
  return (
    <Suspense>
      {edition === Edition.Odtu ? (
        <StudentSignupFlow />
      ) : (
        <SignupFlow edition={edition} />
      )}
    </Suspense>
  );
}
