"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { usePeerRequestSessions } from "@/hooks/use-peer-session-booking";
import {
  PROFILE_COMPLETION_CATEGORIES_QUERY_KEY,
  PROFILE_COMPLETION_QUERY_KEY,
} from "@/hooks/use-student-profile-completion";
import { AppointmentSide } from "@/interfaces/appointment";
import type {
  CreatePeerMentoringRequestInput,
  PeerMentorCard,
  PeerMentoringRequest,
  PeerTopicCategory,
} from "@/interfaces/peer-mentoring";
import { ToastTone } from "@/interfaces/toast";
import { withdrawMentorRequest } from "@/lib/client/mentor-requests";
import {
  createPeerMentoringRequest,
  getPeerMentor,
  getPeerMentorCounts,
  getPeerMentoringRequests,
  getPeerMentors,
} from "@/lib/client/peer-mentoring";
import {
  getProfileCompletionCategories,
  getStudentProfileCompletion,
} from "@/lib/client/student-profile-completion";
import {
  canWithdrawPeerRequest,
  CLOSED_PEER_REQUEST_STATUSES,
  hasPeerMentorBadge,
  offeredSubTopics,
  OPEN_PEER_REQUEST_STATUSES,
  PEER_MENTORING_SIDE_PARAM,
  PEER_REQUEST_MESSAGE_MAX,
  PEER_REQUEST_MESSAGE_MIN,
  PEER_TAKE_TAB_PARAM,
  peerMentoringSide,
  peerRequestAvailability,
  peerTakeTab,
  sharedInterests,
  splitPeerRequests,
  splitRecommended,
  subTopicOptions,
  weeklyHours,
} from "@/lib/peer-mentoring";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import {
  PeerRequestAvailability,
  type PeerTakeTab,
} from "@/types/iskur-student";

export const PEER_MENTORS_QUERY_KEY = ["peer-mentors"] as const;
export const PEER_MENTOR_QUERY_KEY = ["peer-mentor"] as const;
export const PEER_MENTOR_COUNTS_QUERY_KEY = ["peer-mentor-counts"] as const;
export const PEER_MENTORING_REQUESTS_QUERY_KEY = [
  "peer-mentoring",
  "requests",
] as const;

/** One query parameter of this page: read it, or replace it (null drops it) without scrolling. */
function useQueryParam(name: string) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const replace = (value: string | null) => {
    const query = new URLSearchParams(params.toString());
    if (value === null) {
      query.delete(name);
    } else {
      query.set(name, value);
    }
    const search = query.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  };
  return { value: params.get(name), replace };
}

/** Mentorluk Al | Mentorluk Ver, kept in the URL so a link can open either side. */
export function usePeerMentoringSide() {
  const param = useQueryParam(PEER_MENTORING_SIDE_PARAM);
  return {
    side: peerMentoringSide(param.value),
    setSide: (next: AppointmentSide) =>
      param.replace(next === AppointmentSide.Mentor ? next : null),
  };
}

export function usePeerMentoringRequests() {
  return useQuery({
    queryKey: PEER_MENTORING_REQUESTS_QUERY_KEY,
    queryFn: getPeerMentoringRequests,
  });
}

/**
 * What every peer-mentor card needs besides the mentor: the "Neden önerildi?" lines (the student's matching interests
 * first, then the backend's reasons) and whether a request can be sent now.
 */
function usePeerMentorContext() {
  const t = useTranslations("iaIskur.take.discover");
  const tTopic = useTranslations("peerTopics");
  // The student's saved interests; the same query as the profile screens.
  const profile = useQuery({
    queryKey: PROFILE_COMPLETION_QUERY_KEY,
    queryFn: getStudentProfileCompletion,
  });
  const interests = profile.data?.topics ?? [];
  const requests = usePeerMentoringRequests();
  const openRequestMentorIds = useMemo(
    () =>
      new Set(
        (requests.data ?? [])
          .filter((request) =>
            OPEN_PEER_REQUEST_STATUSES.includes(request.status),
          )
          .map((request) => request.mentor.userId),
      ),
    [requests.data],
  );
  const currentMentorIds = useMemo(
    () =>
      new Set(
        splitPeerRequests(requests.data ?? []).active.map(
          (request) => request.mentor.userId,
        ),
      ),
    [requests.data],
  );
  return {
    reasonsOf: (mentor: PeerMentorCard) => {
      const shared = sharedInterests(mentor.categories, interests);
      return [
        ...(shared.length > 0
          ? [
              t("whyInterests", {
                topics: shared.map((topic) => tTopic(topic)).join(", "),
              }),
            ]
          : []),
        ...mentor.recommendationReasons,
      ];
    },
    availabilityOf: (mentor: PeerMentorCard) =>
      peerRequestAvailability(
        openRequestMentorIds.has(mentor.mentorId),
        mentor,
        currentMentorIds.has(mentor.mentorId),
      ),
  };
}

/** Keşfet: the active categories with their mentor counts, the recommended mentors, and the filtered list. */
export function usePeerMentorDirectory() {
  const [category, setCategoryState] = useState<PeerTopicCategory | null>(null);
  const [subTopic, setSubTopic] = useState<string | null>(null);
  const [availableThisWeek, setAvailableThisWeek] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const mentors = useQuery({
    queryKey: [
      ...PEER_MENTORS_QUERY_KEY,
      category,
      deferredQuery,
      subTopic,
      availableThisWeek,
    ],
    queryFn: () =>
      getPeerMentors({
        category,
        query: deferredQuery,
        subTopic,
        availableThisWeek,
      }),
  });
  const catalogue = useQuery({
    queryKey: PROFILE_COMPLETION_CATEGORIES_QUERY_KEY,
    queryFn: getProfileCompletionCategories,
  });
  const counts = useQuery({
    queryKey: PEER_MENTOR_COUNTS_QUERY_KEY,
    queryFn: getPeerMentorCounts,
  });
  const context = usePeerMentorContext();
  const filtered =
    category != null ||
    deferredQuery !== "" ||
    subTopic != null ||
    availableThisWeek;
  const split = splitRecommended(
    mentors.data ?? [],
    (mentor) => context.reasonsOf(mentor).length > 0,
    filtered,
  );

  /** A sub-topic outside the newly chosen category no longer applies. */
  const setCategory = (next: PeerTopicCategory | null) => {
    setCategoryState(next);
    if (
      subTopic != null &&
      !subTopicOptions(catalogue.data ?? [], next).some(
        (option) => option.id === subTopic,
      )
    ) {
      setSubTopic(null);
    }
  };

  return {
    category,
    setCategory,
    /** A category chip toggles its filter. */
    toggleCategory: (next: PeerTopicCategory) =>
      setCategory(category === next ? null : next),
    /** Only the program's active categories can be picked. */
    categories: (catalogue.data ?? []).map((item) => item.id),
    noActiveCategories: catalogue.isSuccess && catalogue.data.length === 0,
    /** How many mentors offer the category; undefined until the counts load. */
    countOf: (item: PeerTopicCategory) =>
      counts.data?.find((count) => count.category === item)?.mentorCount,
    subTopic,
    setSubTopic,
    subTopicOptions: subTopicOptions(catalogue.data ?? [], category),
    availableThisWeek,
    toggleAvailableThisWeek: () => setAvailableThisWeek((current) => !current),
    query,
    setQuery,
    mentors,
    filtered,
    recommended: split.recommended,
    others: split.others,
    ...context,
  };
}

/** One peer mentor's profile page; null when the student's directory doesn't list them. */
export function usePeerMentor(mentorId: string) {
  const detail = useQuery({
    queryKey: [...PEER_MENTOR_QUERY_KEY, mentorId],
    queryFn: () => getPeerMentor(mentorId),
  });
  const catalogue = useQuery({
    queryKey: PROFILE_COMPLETION_CATEGORIES_QUERY_KEY,
    queryFn: getProfileCompletionCategories,
  });
  const context = usePeerMentorContext();
  const [requesting, setRequesting] = useState(false);
  const mentor = detail.data ?? null;
  const availability = mentor ? context.availabilityOf(mentor) : null;
  return {
    requesting,
    openRequest: () => setRequesting(true),
    closeRequest: () => setRequesting(false),
    isLoading: detail.isLoading,
    error: detail.error,
    mentor,
    /** The mentor's sub-topics with their catalogue labels where known. */
    subTopics: mentor
      ? offeredSubTopics(catalogue.data ?? [], mentor.subTopics)
      : [],
    weeklyHours: mentor ? weeklyHours(mentor.weeklyHours) : [],
    reasons: mentor ? context.reasonsOf(mentor) : [],
    badgeVerified: mentor ? hasPeerMentorBadge(mentor.badges) : false,
    availability,
    /** The mentor takes nobody now; a request of the student's own is said on the button instead. */
    closedReason:
      availability === PeerRequestAvailability.Full ||
      availability === PeerRequestAvailability.Paused
        ? availability
        : undefined,
  };
}

/** Which Mentorluk Al tab is open; Keşfet first. In the URL, so "Mentorluklarım'a git" can open the other one. */
export function usePeerTakeTab() {
  const param = useQueryParam(PEER_TAKE_TAB_PARAM);
  return {
    tab: peerTakeTab(param.value),
    setTab: (next: PeerTakeTab) =>
      param.replace(next === PeerTakeTab.Mine ? next : null),
  };
}

/** Mentorluklarım's tab count: every request the student sent; undefined until they load. */
export function usePeerMentorshipCount() {
  return usePeerMentoringRequests().data?.length;
}

/** The mentor's places and free slots change with every request sent or withdrawn. */
function invalidatePeerRequests(queryClient: QueryClient) {
  return Promise.all(
    [
      PEER_MENTORING_REQUESTS_QUERY_KEY,
      PEER_MENTOR_QUERY_KEY,
      PEER_MENTORS_QUERY_KEY,
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

/** "Talebi geri çek" on an unanswered request, behind a confirmation. */
export function usePeerRequestWithdrawal() {
  const t = useTranslations("iaIskur.take.withdraw");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PeerMentoringRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawMentorRequest(id),
    onSuccess: () => invalidatePeerRequests(queryClient),
  });

  const close = () => {
    setPending(null);
    setError(null);
  };

  const confirm = async () => {
    if (!pending || withdraw.isPending) return;
    setError(null);
    try {
      await withdraw.mutateAsync(pending.id);
      showToast({ message: t("done"), tone: ToastTone.Success });
      close();
    } catch (withdrawError) {
      setError(errorMessage(withdrawError, t("failed")));
    }
  };

  return {
    canWithdraw: canWithdrawPeerRequest,
    /** The request whose confirmation is open. */
    pending,
    ask: (request: PeerMentoringRequest) => {
      setError(null);
      setPending(request);
    },
    close,
    /** Escape or Vazgeç while the request is on its way would hide its outcome. */
    dismiss: () => {
      if (!withdraw.isPending) close();
    },
    confirm,
    error,
    isWithdrawing: withdraw.isPending,
  };
}

/** Mentorluklarım: active mentorships (accepted requests) with their next session, and the other requests. */
export function useMyPeerMentorships() {
  const requests = usePeerMentoringRequests();
  const sessions = usePeerRequestSessions();
  const withdrawal = usePeerRequestWithdrawal();
  const [booking, setBooking] = useState<PeerMentoringRequest | null>(null);
  const split = splitPeerRequests(requests.data ?? []);
  return {
    /** The accepted request whose "Görüşme Planla" dialog is open. */
    booking,
    openBooking: setBooking,
    closeBooking: () => setBooking(null),
    query: requests,
    count: requests.data?.length ?? 0,
    active: split.active,
    /** Waiting for the mentor. */
    pending: split.others.filter(
      (request) => !CLOSED_PEER_REQUEST_STATUSES.includes(request.status),
    ),
    /** Ended without a mentorship; "Başka mentor bul" on each. */
    closed: split.others.filter((request) =>
      CLOSED_PEER_REQUEST_STATUSES.includes(request.status),
    ),
    sessionOf: (requestId: string) => sessions.byRequest.get(requestId) ?? null,
    sessionsLoading: sessions.isLoading,
    withdrawal,
  };
}

/**
 * The "Talep gönder" dialog: one of the mentor's categories and a short message. Once sent, the dialog shows the
 * request it created ("Talebin iletildi") instead of the form.
 */
export function usePeerMentorRequestForm(mentor: PeerMentorCard) {
  const t = useTranslations("iaIskur.take.dialog");
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<PeerTopicCategory | null>(
    mentor.categories[0] ?? null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (input: CreatePeerMentoringRequestInput) =>
      createPeerMentoringRequest(input),
    onSuccess: () => invalidatePeerRequests(queryClient),
  });

  const changeMessage = (value: string) => {
    setError(null);
    setMessage(value);
  };

  const submit = async () => {
    if (send.isPending) return;
    const text = message.trim();
    if (text.length < PEER_REQUEST_MESSAGE_MIN) {
      setError(t("messageTooShort", { min: PEER_REQUEST_MESSAGE_MIN }));
      return;
    }
    if (!category) return;
    try {
      await send.mutateAsync({
        mentorId: mentor.mentorId,
        category,
        message: text,
      });
    } catch (sendError) {
      setError(errorMessage(sendError, t("failed")));
    }
  };

  return {
    category,
    setCategory,
    message,
    setMessage: changeMessage,
    messageLength: message.trim().length,
    minLength: PEER_REQUEST_MESSAGE_MIN,
    maxLength: PEER_REQUEST_MESSAGE_MAX,
    error,
    isSending: send.isPending,
    submit,
    /** The request just sent; null while the form is still open. */
    sent: send.data ?? null,
  };
}
