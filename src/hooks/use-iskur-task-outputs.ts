"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getIskurTaskOutputs,
  iskurProgramTaskOutputHref,
} from "@/lib/client/iskur-tasks";

export const iskurTaskOutputsQueryKey = (programId: string) =>
  ["iskur-task-outputs", programId] as const;

/** The coordinator's list of the files handed in with the program's İŞKUR tasks, and where each downloads from. */
export function useIskurTaskOutputs(programId: string) {
  const query = useQuery({
    queryKey: iskurTaskOutputsQueryKey(programId),
    queryFn: () => getIskurTaskOutputs(programId),
  });
  const tasks = query.data?.tasks ?? [];
  return {
    isLoading: query.isPending,
    loadError: query.isError,
    tasks,
    enabled: query.data?.enabled ?? false,
    fileCount: tasks.reduce((sum, task) => sum + task.files.length, 0),
    hrefOf: (taskId: string, outputId: string) =>
      iskurProgramTaskOutputHref(programId, taskId, outputId),
  };
}
