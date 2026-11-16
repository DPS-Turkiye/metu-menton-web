"use client";

import { useRouter } from "next/navigation";

import { useCoordinatorPrograms } from "@/hooks/use-coordinator-programs";
import { programSwitcherOptions } from "@/lib/coordinator-program-detail";

/** The header's "Program: …" picker: the coordinator's other programs, and a jump to one of them. */
export function useProgramSwitcher(programId: string, programName: string) {
  const router = useRouter();
  const programs = useCoordinatorPrograms();
  return {
    options: programSwitcherOptions(
      programs.data ?? [],
      programId,
      programName,
    ),
    switchTo: (id: string) => {
      if (id !== programId) {
        router.push(`/coordinator/programs/${encodeURIComponent(id)}`);
      }
    },
  };
}
