import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { StudentFrame } from "@/components/student/student-frame";
import { Edition } from "@/interfaces/edition";
import { requireEdition } from "@/lib/server/edition";
import { iskurOnboardingRedirect } from "@/lib/server/iskur-onboarding-gate";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireEdition(Edition.Odtu);
  const onboarding = await iskurOnboardingRedirect();
  if (onboarding) redirect(onboarding);
  return <StudentFrame>{children}</StudentFrame>;
}
