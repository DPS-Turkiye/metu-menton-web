"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  TrainingState,
  type StudentTraining,
  type TrainingAttemptResult,
} from "@/interfaces/training";
import {
  getStudentTraining,
  getTrainingQuiz,
  postPrismCompleted,
  postTrainingAttempt,
  postVideoWatched,
} from "@/lib/client/training";
import { httpUrlOrNull } from "@/lib/utils";

export const STUDENT_TRAINING_QUERY_KEY = ["training", "peer"] as const;

/**
 * The student's Akran Mentoru training: video → quiz → result. The quiz is fetched only when the student starts
 * it, in a fresh order each time; answers are kept by question id and the option's own index. On ODTÜ the training
 * runs on Prism instead: the page links there and the student can say they finished it.
 */
export function useStudentTraining() {
  const queryClient = useQueryClient();
  const training = useQuery({
    queryKey: STUDENT_TRAINING_QUERY_KEY,
    queryFn: getStudentTraining,
  });
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TrainingAttemptResult | null>(null);
  const store = (next: StudentTraining) =>
    queryClient.setQueryData(STUDENT_TRAINING_QUERY_KEY, next);

  const quiz = useQuery({
    queryKey: [...STUDENT_TRAINING_QUERY_KEY, "quiz", training.data?.version],
    queryFn: getTrainingQuiz,
    enabled: started,
    staleTime: Infinity,
    gcTime: 0,
  });
  const watched = useMutation({
    mutationFn: postVideoWatched,
    onSuccess: store,
  });
  const prismDone = useMutation({
    mutationFn: postPrismCompleted,
    onSuccess: store,
  });
  const submit = useMutation({
    mutationFn: () => postTrainingAttempt(quiz.data?.version ?? 0, answers),
    onSuccess: (outcome) => {
      setResult(outcome);
      setStarted(false);
      setAnswers({});
      store(outcome.training);
      queryClient.removeQueries({
        queryKey: [...STUDENT_TRAINING_QUERY_KEY, "quiz"],
      });
    },
  });

  const questionCount = quiz.data?.questions.length ?? 0;
  return {
    training: training.data ?? null,
    isLoading: training.isLoading,
    loadError: training.error,
    /** Only a plain http(s) link becomes the Prism button's href. */
    prismHref: httpUrlOrNull(training.data?.prismUrl),
    /** Asked to retake before the coordinator set the link (or after it was cleared): say it is coming. */
    prismLinkPending:
      training.data?.state === TrainingState.PrismRetake &&
      httpUrlOrNull(training.data.prismUrl) === null,
    markPrismCompleted: () => {
      if (!prismDone.isPending) prismDone.mutate();
    },
    isMarkingPrism: prismDone.isPending,
    prismError: prismDone.error,
    markWatched: () => {
      if (!watched.isPending) watched.mutate();
    },
    quiz: started ? (quiz.data ?? null) : null,
    quizLoading: started && quiz.isLoading,
    quizError: quiz.error,
    start: () => {
      setResult(null);
      setAnswers({});
      setStarted(true);
    },
    answers,
    choose: (questionId: string, option: number) =>
      setAnswers((current) => ({ ...current, [questionId]: option })),
    canSubmit:
      questionCount > 0 &&
      Object.keys(answers).length === questionCount &&
      !submit.isPending,
    submit: () => submit.mutate(),
    isSubmitting: submit.isPending,
    submitError: submit.error,
    result,
  };
}
