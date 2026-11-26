"use client";

import { QueryNotice } from "@/components/admin/admin-ui";
import { PeerParticipantsView } from "@/components/coordinator/peer-participants-view";
import { ProgramOhStudentsView } from "@/components/coordinator/program-oh-students-view";
import { useCoordinatorProgram } from "@/hooks/use-coordinator-program";
import {
  ProgramTab,
  studentsAreOfficeHours,
} from "@/lib/coordinator-program-detail";

/** Katılımcılar › Öğrenciler: the Akran Mentörlüğü roster, or, with Office Hours alone, who asked the academicians. */
export function ProgramStudentsView({ programId }: { programId: string }) {
  const program = useCoordinatorProgram(programId);
  if (!program.data) {
    return <QueryNotice isLoading={program.isLoading} error={program.error} />;
  }
  return studentsAreOfficeHours(program.data) ? (
    <ProgramOhStudentsView programId={programId} />
  ) : (
    <PeerParticipantsView programId={programId} tab={ProgramTab.Students} />
  );
}
