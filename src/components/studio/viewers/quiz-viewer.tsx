"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Flame,
  MessageSquareQuote,
  Play,
  RotateCcw,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fireContainerConfetti } from "@/lib/container-confetti";
import {
  buildQuizQueue,
  buildQuizSourceFilterOptions,
  buildWrongAnswerChatPrompt,
  createQuizDeck,
  shuffleQuestionIndices,
  type QuizFilterId,
  type QuizQuestionItem,
  type QuizSourceRef,
} from "@/lib/studio/quiz-study";
import {
  getQuizAccuracy,
  getQuizAverageTime,
  getQuizRank,
  type QuizAnswer,
} from "@/lib/studio/quiz-utils";
import { useCitationStore } from "@/stores/citation.store";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";
import { cn } from "@/lib/utils";
import type { QuizContent, StudioArtifactViewMode } from "@/types";

type QuizGameState = "welcome" | "playing" | "summary";

const PANEL_CLASS = "p-4";

function getQuizFilterLabel(
  value: string | null,
  options: { value: QuizFilterId; label: string }[],
): string {
  if (!value || value === "all") {
    return "All questions";
  }

  return (
    options.find((option) => option.value === value)?.label ?? "All questions"
  );
}

function QuizSourceFilter({
  filterId,
  options,
  onChange,
}: {
  filterId: QuizFilterId;
  options: { value: QuizFilterId; label: string }[];
  onChange: (filterId: QuizFilterId) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs">Questions to quiz</p>
      <Select
        value={filterId}
        onValueChange={(value) => onChange(value as QuizFilterId)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Questions to quiz">
            {(value) => getQuizFilterLabel(value, options)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All questions</SelectItem>
          {options.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Quiz from sources</SelectLabel>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}

function QuizSourceActions({
  question,
  showAskInChat,
  onViewSource,
  onAskInChat,
}: {
  question: QuizQuestionItem;
  showAskInChat: boolean;
  onViewSource: () => void;
  onAskInChat: () => void;
}) {
  if (!question.sourceId && !showAskInChat) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {question.sourceId && question.sourceTitle ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onViewSource}
          className="h-8 gap-1.5"
        >
          <ExternalLink className="size-3.5" />
          View source
        </Button>
      ) : null}
      {showAskInChat ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={onAskInChat}
          className="h-8 gap-1.5"
        >
          <MessageSquareQuote className="size-3.5" />
          Ask in chat
        </Button>
      ) : null}
    </div>
  );
}

function QuizWelcome({
  questionCount,
  filterId,
  sourceFilterOptions,
  onFilterChange,
  onStart,
}: {
  questionCount: number;
  filterId: QuizFilterId;
  sourceFilterOptions: { value: QuizFilterId; label: string }[];
  onFilterChange: (filterId: QuizFilterId) => void;
  onStart: () => void;
}) {
  return (
    <div
      className={cn(
        PANEL_CLASS,
        "flex min-h-[400px] flex-col items-center justify-center text-center",
      )}
    >
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
        <Award className="size-8 text-primary" />
      </div>
      <h2 className="mb-2 font-bold text-foreground text-xl md:text-2xl">
        Notebook Challenge
      </h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Test your knowledge of the selected sources. Wrong answers can be traced
        back to the original material.
      </p>

      <div className="mb-6 w-full max-w-xs text-left">
        <QuizSourceFilter
          filterId={filterId}
          options={sourceFilterOptions}
          onChange={onFilterChange}
        />
      </div>

      <div className="mb-8 grid w-full max-w-xs grid-cols-2 gap-4 text-muted-foreground text-xs">
        <div className="rounded-xl border border-border bg-muted/50 p-3">
          <span className="mb-1 block font-semibold text-foreground">
            {questionCount}
          </span>
          Questions
        </div>
        <div className="rounded-xl border border-border bg-muted/50 p-3">
          <span className="mb-1 block font-semibold text-foreground">
            Stopwatch
          </span>
          Time tracked
        </div>
      </div>
      <Button onClick={onStart} size={"lg"} disabled={questionCount === 0}>
        <Play className="size-4 fill-current" />
        Start quiz
      </Button>
    </div>
  );
}

function QuizSummary({
  deck,
  answers,
  sessionCount,
  maxStreak,
  reviewIndex,
  onReviewIndexChange,
  onRetake,
  onViewSource,
  onAskInChat,
  showNotebookActions,
}: {
  deck: QuizQuestionItem[];
  answers: QuizAnswer[];
  sessionCount: number;
  maxStreak: number;
  reviewIndex: number | null;
  onReviewIndexChange: (index: number | null) => void;
  onRetake: () => void;
  onViewSource: (question: QuizQuestionItem) => void;
  onAskInChat: (question: QuizQuestionItem, selectedOption: number) => void;
  showNotebookActions: boolean;
}) {
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const accuracy = getQuizAccuracy(answers, sessionCount);
  const avgTime = getQuizAverageTime(answers);
  const rank = getQuizRank(accuracy);
  const reviewedAnswer = reviewIndex === null ? null : answers[reviewIndex];
  const reviewedQuestion =
    reviewedAnswer === null ? null : deck[reviewedAnswer.deckIndex];

  return (
    <div className={cn(PANEL_CLASS, "flex flex-col gap-6")}>
      <div className="text-center">
        <h2 className="font-bold text-lg">Challenge completed!</h2>
        <p className="text-muted-foreground text-xs">
          Detailed performance report
        </p>
      </div>

      <div className="flex items-center justify-around gap-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="relative flex size-24 items-center justify-center">
          <svg className="size-full -rotate-90 transform">
            <circle
              cx="48"
              cy="48"
              r="40"
              className="fill-transparent stroke-muted-foreground/10"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              className="fill-transparent stroke-primary transition-all duration-1000"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - accuracy / 100)}
            />
          </svg>
          <span className="absolute font-bold text-lg">{accuracy}%</span>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-muted-foreground/60 text-xs">
            Performance rank
          </span>
          <span className={cn("mt-0.5 font-bold text-lg", rank.color)}>
            {rank.title}
          </span>
          <span className="mt-1 text-muted-foreground text-xs">
            Answered {correctCount} of {sessionCount} correctly
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Flame className="size-4" />
          </div>
          <div>
            <span className="block font-bold text-foreground">{maxStreak}</span>
            <span className="text-muted-foreground">Max streak</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <Timer className="size-4" />
          </div>
          <div>
            <span className="block font-bold text-foreground">{avgTime}s</span>
            <span className="text-muted-foreground">Avg speed</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Review questions
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {answers.map((answer, answerIndex) => (
            <button
              key={`${answer.deckIndex}-${answerIndex}`}
              type="button"
              onClick={() => onReviewIndexChange(answerIndex)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border font-bold text-xs transition-all hover:scale-105 cursor-pointer",
                reviewIndex === answerIndex &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-card",
                answer.isCorrect
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              {answerIndex + 1}
            </button>
          ))}
        </div>
      </div>

      {reviewedAnswer && reviewedQuestion && reviewIndex !== null ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/30 p-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-primary">
              Question {reviewIndex + 1} detail
            </span>
            <span className="text-muted-foreground/60 text-xs">
              Speed: {reviewedAnswer.timeSpent}s
            </span>
          </div>
          {reviewedQuestion.sourceTitle ? (
            <p className="text-muted-foreground text-xs">
              Source: {reviewedQuestion.sourceTitle}
            </p>
          ) : null}
          <p className="font-medium text-foreground/90">
            {reviewedQuestion.question}
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-muted-foreground">
                Your answer:
              </span>
              <span
                className={cn(
                  "font-medium",
                  reviewedAnswer.isCorrect
                    ? "text-emerald-500"
                    : "text-destructive",
                )}
              >
                {reviewedQuestion.options[reviewedAnswer.selectedOption]}
              </span>
            </div>
            {!reviewedAnswer.isCorrect ? (
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-muted-foreground">Correct:</span>
                <span className="font-medium text-emerald-500">
                  {reviewedQuestion.options[reviewedQuestion.correctIndex]}
                </span>
              </div>
            ) : null}
          </div>
          {reviewedQuestion.citationQuote ? (
            <blockquote className="border-primary/30 border-l-2 pl-3 text-muted-foreground/70 italic leading-relaxed">
              "{reviewedQuestion.citationQuote}"
            </blockquote>
          ) : null}
          <div className="mt-2 flex gap-2 border-border/50 border-t pt-2.5">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-muted-foreground leading-relaxed">
              {reviewedQuestion.explanation}
            </p>
          </div>
          {showNotebookActions ? (
            <QuizSourceActions
              question={reviewedQuestion}
              showAskInChat={!reviewedAnswer.isCorrect}
              onViewSource={() => onViewSource(reviewedQuestion)}
              onAskInChat={() =>
                onAskInChat(reviewedQuestion, reviewedAnswer.selectedOption)
              }
            />
          ) : null}
        </div>
      ) : null}

      <Button variant="outline" onClick={onRetake} className="mt-2 h-10 gap-2">
        <RotateCcw className="size-4" />
        Retake quiz
      </Button>
    </div>
  );
}

function QuizPlaying({
  question,
  sessionIndex,
  sessionCount,
  selected,
  seconds,
  streak,
  filterId,
  sourceFilterOptions,
  onFilterChange,
  onSelect,
  onNext,
  onViewSource,
  onAskInChat,
  showNotebookActions,
}: {
  question: QuizQuestionItem;
  sessionIndex: number;
  sessionCount: number;
  selected: number | null;
  seconds: number;
  streak: number;
  filterId: QuizFilterId;
  sourceFilterOptions: { value: QuizFilterId; label: string }[];
  onFilterChange: (filterId: QuizFilterId) => void;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
  onViewSource: () => void;
  onAskInChat: () => void;
  showNotebookActions: boolean;
}) {
  const isAnswered = selected !== null;
  const isCorrect = selected === question.correctIndex;
  const progressPercent = ((sessionIndex + 1) / sessionCount) * 100;
  const isLastQuestion = sessionIndex + 1 === sessionCount;

  return (
    <div className={cn(PANEL_CLASS, "flex flex-col gap-6")}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground/90">
            Question {sessionIndex + 1} of {sessionCount}
          </span>
          {streak >= 2 ? (
            <span className="flex animate-pulse items-center gap-1 font-bold text-amber-500">
              <Flame className="size-3.5 fill-current" />
              {streak} streak
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Timer className="size-3.5" />
          <span>{seconds}s</span>
          {isAnswered && seconds <= 5 && isCorrect ? (
            <span className="flex items-center gap-0.5 font-bold text-amber-500 text-xs">
              <Zap className="size-3 fill-current" />
              Speedy!
            </span>
          ) : null}
        </div>
      </div>

      <QuizSourceFilter
        filterId={filterId}
        options={sourceFilterOptions}
        onChange={onFilterChange}
      />

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div
        className={cn(
          "rounded-xl border border-border bg-muted/30 p-5",
          question.sourceColor && "border-l-4",
        )}
        style={
          question.sourceColor
            ? { borderLeftColor: question.sourceColor }
            : undefined
        }
      >
        {question.sourceTitle ? (
          <p className="mb-2 text-xs text-muted-foreground uppercase tracking-wide">
            {question.sourceTitle}
          </p>
        ) : null}
        <p className="font-semibold text-base text-foreground leading-relaxed md:text-lg">
          {question.question}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {question.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const isCorrectOption = optionIndex === question.correctIndex;

          return (
            <button
              key={`${question.id}-${optionIndex}`}
              type="button"
              disabled={isAnswered}
              onClick={() => onSelect(optionIndex)}
              className={cn(
                "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
                !isAnswered &&
                  "border-border bg-muted/30 text-foreground/90 hover:border-primary/40 hover:bg-muted",
                isAnswered &&
                  isCorrectOption &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                isAnswered &&
                  isSelected &&
                  !isCorrectOption &&
                  "border-destructive/50 bg-destructive/10 text-destructive",
                isAnswered &&
                  !isSelected &&
                  !isCorrectOption &&
                  "border-border/40 bg-muted/10 opacity-40",
              )}
            >
              <span className="leading-tight">{option}</span>
              {isAnswered && isCorrectOption ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : null}
              {isAnswered && isSelected && !isCorrectOption ? (
                <XCircle className="size-4 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>

      {isAnswered ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/30 p-4 text-xs">
          <p
            className={cn(
              "font-bold text-xs uppercase tracking-wider",
              isCorrect ? "text-emerald-500" : "text-destructive",
            )}
          >
            {isCorrect ? "Correct answer!" : "Incorrect answer"}
          </p>
          {question.citationQuote ? (
            <blockquote className="border-primary/30 border-l-2 pl-3 text-muted-foreground/70 italic leading-relaxed">
              "{question.citationQuote}"
            </blockquote>
          ) : null}
          <p className="text-muted-foreground leading-relaxed">
            {question.explanation}
          </p>
          {showNotebookActions ? (
            <QuizSourceActions
              question={question}
              showAskInChat={!isCorrect}
              onViewSource={onViewSource}
              onAskInChat={onAskInChat}
            />
          ) : null}
        </div>
      ) : null}

      {isAnswered ? (
        <Button
          onClick={onNext}
          className="h-10 gap-2 self-end px-5 font-semibold"
        >
          {isLastQuestion ? "Finish quiz" : "Next question"}
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function QuizViewer({
  content,
  sources = [],
  mode = "studio",
}: {
  content: QuizContent;
  sources?: QuizSourceRef[];
  mode?: StudioArtifactViewMode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sourceRefs = useMemo(
    () => sources.map((source) => ({ id: source.id, title: source.title })),
    [sources],
  );
  const deck = useMemo(
    () => createQuizDeck(content.questions, sourceRefs),
    [content.questions, sourceRefs],
  );
  const sourceFilterOptions = useMemo(
    () => buildQuizSourceFilterOptions(deck, sourceRefs),
    [deck, sourceRefs],
  );

  const [gameState, setGameState] = useState<QuizGameState>("welcome");
  const [filterId, setFilterId] = useState<QuizFilterId>("all");
  const [orderedQueue, setOrderedQueue] = useState<number[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const openSource = useCitationStore((state) => state.openSource);
  const handleSubmit = useNotebookChatStore((state) => state.handleSubmit);
  const chatStatus = useNotebookChatStore((state) => state.chatStatus);

  const safeSessionIndex =
    orderedQueue.length === 0
      ? 0
      : Math.min(sessionIndex, orderedQueue.length - 1);

  const deckIndex = orderedQueue[safeSessionIndex];
  const question = deckIndex === undefined ? undefined : deck[deckIndex];

  const filteredCount = useMemo(
    () => buildQuizQueue(deck, filterId).length,
    [deck, filterId],
  );

  const resetSessionState = useCallback(() => {
    setSessionIndex(0);
    setSelected(null);
    setAnswers([]);
    setSeconds(0);
    setStreak(0);
    setMaxStreak(0);
    setReviewIndex(null);
  }, []);

  const buildQueue = useCallback(
    (nextFilterId: QuizFilterId) => {
      return shuffleQuestionIndices(buildQuizQueue(deck, nextFilterId));
    },
    [deck],
  );

  const startQuiz = useCallback(
    (nextFilterId: QuizFilterId = filterId) => {
      const queue = buildQueue(nextFilterId);
      setFilterId(nextFilterId);
      setOrderedQueue(queue);
      resetSessionState();
      setGameState(queue.length === 0 ? "welcome" : "playing");
    },
    [buildQueue, filterId, resetSessionState],
  );

  const changeFilter = useCallback(
    (nextFilterId: QuizFilterId) => {
      setFilterId(nextFilterId);
      if (gameState === "welcome") {
        return;
      }

      startQuiz(nextFilterId);
    },
    [gameState, startQuiz],
  );

  useEffect(() => {
    setFilterId("all");
    setOrderedQueue(buildQueue("all"));
    setGameState("welcome");
    resetSessionState();
  }, [content.questions, buildQueue, resetSessionState]);

  useEffect(() => {
    if (gameState !== "playing" || selected !== null) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, safeSessionIndex, selected]);

  useEffect(() => {
    if (gameState !== "summary") {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    return fireContainerConfetti(container);
  }, [gameState]);

  const handleViewSource = useCallback(
    (item: QuizQuestionItem) => {
      if (!item.sourceId || !item.sourceTitle) {
        return;
      }

      openSource(item.sourceId, item.sourceTitle);
    },
    [openSource],
  );

  const handleAskInChat = useCallback(
    async (item: QuizQuestionItem, selectedOption: number) => {
      if (chatStatus === "streaming" || chatStatus === "submitted") {
        toast.error("Wait for the current response to finish.");
        return;
      }

      try {
        await handleSubmit({
          text: buildWrongAnswerChatPrompt(item, selectedOption),
          files: [],
        });
        toast.success("Question sent to chat");
      } catch {
        toast.error("Failed to send question to chat.");
      }
    },
    [chatStatus, handleSubmit],
  );

  const handleSelect = (optionIndex: number) => {
    if (selected !== null || !question || deckIndex === undefined) {
      return;
    }

    setSelected(optionIndex);

    const isCorrect = optionIndex === question.correctIndex;
    const nextStreak = isCorrect ? streak + 1 : 0;
    setStreak(nextStreak);
    setMaxStreak((current) => Math.max(current, nextStreak));

    setAnswers((current) => [
      ...current,
      {
        deckIndex,
        selectedOption: optionIndex,
        isCorrect,
        timeSpent: seconds,
      },
    ]);
  };

  const handleNext = () => {
    if (sessionIndex + 1 < orderedQueue.length) {
      setSelected(null);
      setSessionIndex((current) => current + 1);
      return;
    }

    setGameState("summary");
  };

  const showNotebookActions = mode === "studio";

  if (deck.length === 0) {
    return <p className="text-muted-foreground text-sm">No questions found.</p>;
  }

  if (gameState === "welcome" && filteredCount === 0) {
    return (
      <div className={cn(PANEL_CLASS, "mx-auto max-w-xl text-center")}>
        <p className="mb-4 font-medium text-sm text-foreground">
          No questions for this source.
        </p>
        <QuizSourceFilter
          filterId={filterId}
          options={sourceFilterOptions}
          onChange={changeFilter}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      {gameState === "welcome" ? (
        <QuizWelcome
          questionCount={filteredCount}
          filterId={filterId}
          sourceFilterOptions={sourceFilterOptions}
          onFilterChange={changeFilter}
          onStart={() => startQuiz(filterId)}
        />
      ) : null}

      {gameState === "summary" ? (
        <QuizSummary
          deck={deck}
          answers={answers}
          sessionCount={orderedQueue.length}
          maxStreak={maxStreak}
          reviewIndex={reviewIndex}
          onReviewIndexChange={setReviewIndex}
          onRetake={() => startQuiz(filterId)}
          onViewSource={handleViewSource}
          onAskInChat={handleAskInChat}
          showNotebookActions={showNotebookActions}
        />
      ) : null}

      {gameState === "playing" && question ? (
        <QuizPlaying
          question={question}
          sessionIndex={safeSessionIndex}
          sessionCount={orderedQueue.length}
          selected={selected}
          seconds={seconds}
          streak={streak}
          filterId={filterId}
          sourceFilterOptions={sourceFilterOptions}
          onFilterChange={changeFilter}
          onSelect={handleSelect}
          onNext={handleNext}
          onViewSource={() => handleViewSource(question)}
          onAskInChat={() => {
            if (selected !== null) {
              handleAskInChat(question, selected);
            }
          }}
          showNotebookActions={showNotebookActions}
        />
      ) : null}
    </div>
  );
}
