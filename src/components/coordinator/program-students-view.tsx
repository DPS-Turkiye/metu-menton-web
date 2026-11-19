"use client";

import { QueryNotice } from "@/components/admin/admin-ui";
import { PeerParticipantsView } from "@/components/coordinator/peer-participants-view";
import { ProgramOhStudentsView } from "@/components/coordinator/program-oh-students-view";
import { useCoordinatorProgram } from "@/hooks/use-coordinator-program";
import { ProgramType } from "@/interfaces/program";
import { ProgramTab } from "@/lib/coordinator-program-detail";

/** Katılımcılar › Öğrenciler: the peer program's roster, or who asked an Office Hours program's academicians. */
export function ProgramStudentsView({ programId }: { programId: string }) {
  const program = useCoordinatorProgram(programId);
  if (!program.data) {
    return <QueryNotice isLoading={program.isLoading} error={program.error} />;
  }
  return program.data.program.type === ProgramType.OfficeHours ? (
    <ProgramOhStudentsView programId={programId} />
  ) : (
    <PeerParticipantsView programId={programId} tab={ProgramTab.Students} />
  );
}
