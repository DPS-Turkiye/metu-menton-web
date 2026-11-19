"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getPrismLink, putPrismLink } from "@/lib/client/training";

const prismLinkQueryKey = (programId: string) =>
  ["coordinator-programs", programId, "training", "prism"] as const;

/** Program Ayarları › Akran Mentoru eğitimi › Prism bağlantısı: the link field and "Bağlantıyı kaydet". */
export function usePrismLink(programId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: prismLinkQueryKey(programId),
    queryFn: () => getPrismLink(programId),
  });
  const [edited, setEdited] = useState<string | null>(null);
  const url = edited ?? query.data?.url ?? "";

  const save = useMutation({
    mutationFn: (value: string) => putPrismLink(programId, value.trim()),
    onSuccess: (saved) => {
      queryClient.setQueryData(prismLinkQueryKey(programId), saved);
      setEdited(null);
    },
  });

  return {
    link: query.data ?? null,
    isLoading: query.isLoading,
    loadError: query.error,
    /** False on ODTÜ, where the training runs on Prism and the quiz form is not shown. */
    inAppQuiz: query.data?.inAppQuiz ?? false,
    url,
    setUrl: (value: string) => {
      save.reset();
      setEdited(value);
    },
    canSave:
      url.trim().length > 0 &&
      url.trim() !== (query.data?.url ?? "") &&
      !save.isPending,
    save: () => {
      if (url.trim()) save.mutate(url);
    },
    isSaving: save.isPending,
    saveError: save.error,
    saved: save.isSuccess && edited === null,
  };
}
