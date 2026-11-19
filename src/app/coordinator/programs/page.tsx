"use client";

import { OdtuProgramsListView } from "@/components/coordinator/odtu-programs-list-view";
import { ProgramsListView } from "@/components/coordinator/programs-list-view";
import { useEdition } from "@/hooks/use-edition";
import { Edition } from "@/interfaces/edition";

export default function CoordinatorProgramsPage() {
  return useEdition() === Edition.Odtu ? (
    <OdtuProgramsListView />
  ) : (
    <ProgramsListView />
  );
}
