"use client";

import { OdtuProgramsView } from "@/components/admin/odtu-programs-view";
import { ProgramsView } from "@/components/admin/programs-view";
import { useEdition } from "@/hooks/use-edition";
import { Edition } from "@/interfaces/edition";

export default function AdminProgramsPage() {
  return useEdition() === Edition.Odtu ? (
    <OdtuProgramsView />
  ) : (
    <ProgramsView />
  );
}
