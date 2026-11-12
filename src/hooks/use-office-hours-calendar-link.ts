"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  OfficeHoursCalendarFeed,
  type OfficeHoursCalendarLink,
} from "@/interfaces/office-hours";
import {
  getCourseCalendarLink,
  getPersonalCalendarLink,
  resetCourseCalendarLink,
  resetPersonalCalendarLink,
} from "@/lib/client/office-hours-calendar";

type LinkSource = {
  queryKey: readonly string[];
  get: () => Promise<OfficeHoursCalendarLink>;
  reset: () => Promise<OfficeHoursCalendarLink>;
};

function linkSource(
  feed: OfficeHoursCalendarFeed,
  courseId: string,
): LinkSource {
  switch (feed) {
    case OfficeHoursCalendarFeed.Personal:
      return {
        queryKey: ["office-hours", "calendar-link", "personal"],
        get: getPersonalCalendarLink,
        reset: resetPersonalCalendarLink,
      };
    case OfficeHoursCalendarFeed.Course:
      return {
        queryKey: ["office-hours", "calendar-link", "course", courseId],
        get: () => getCourseCalendarLink(courseId),
        reset: () => resetCourseCalendarLink(courseId),
      };
  }
}

export enum CopyState {
  Idle = "idle",
  Copied = "copied",
  Failed = "failed",
}

/**
 * One calendar link row. The link is asked for only when the person opens it, because asking makes it: a visit to
 * the course page should not leave a link behind for everyone who passed by.
 */
export function useOfficeHoursCalendarLink(
  feed: OfficeHoursCalendarFeed,
  courseId: string,
) {
  const source = linkSource(feed, courseId);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [copy, setCopy] = useState(CopyState.Idle);
  const link = useQuery({
    queryKey: source.queryKey,
    queryFn: source.get,
    enabled: open,
  });
  const reset = useMutation({
    mutationFn: source.reset,
    onSuccess: (next) => {
      queryClient.setQueryData(source.queryKey, next);
      setConfirmingReset(false);
      setCopy(CopyState.Idle);
    },
  });

  return {
    open,
    show: () => setOpen(true),
    url: link.data?.url ?? null,
    isLoading: link.isLoading,
    loadFailed: link.isError,
    retry: () => void link.refetch(),
    copy,
    async copyLink() {
      if (!link.data) return;
      try {
        await navigator.clipboard.writeText(link.data.url);
        setCopy(CopyState.Copied);
      } catch {
        // Moodle shows the tool in a frame that may not allow the clipboard; the field stays there to copy by hand.
        setCopy(CopyState.Failed);
      }
    },
    confirmingReset,
    askReset: () => setConfirmingReset(true),
    cancelReset: () => setConfirmingReset(false),
    confirmReset: () => reset.mutate(),
    isResetting: reset.isPending,
    resetFailed: reset.isError,
  };
}
