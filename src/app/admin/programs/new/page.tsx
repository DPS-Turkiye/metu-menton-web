"use client";

import { OdtuProgramWizardView } from "@/components/admin/odtu-program-wizard-view";
import { ProgramWizardView } from "@/components/admin/program-wizard-view";
import { useEdition } from "@/hooks/use-edition";
import { Edition } from "@/interfaces/edition";

export default function AdminNewProgramPage() {
  return useEdition() === Edition.Odtu ? (
    <OdtuProgramWizardView />
  ) : (
    <ProgramWizardView />
  );
}
