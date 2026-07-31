"use client";

import { motion } from "motion/react";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  MessageSquareQuote,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
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
import {
  buildSourceFilterOptions,
  buildFlashcardChatPrompt,
  buildStudyQueue,
  createDeck,
  createEmptySessionStats,
  defaultProgress,
  FLASHCARD_EMOJI_RATINGS,
  getRatingToastMessage,
  loadFlashcardProgress,
  saveFlashcardProgress,
  scheduleReview,
  shuffleIndices,
  type FlashcardDeckItem,
  type FlashcardFilterId,
  type FlashcardProgress,
  type FlashcardRating,
  type FlashcardSessionStats,
  type FlashcardSourceRef,
} from "@/lib/studio/flashcard-study";
import { useCitationStore } from "@/stores/citation.store";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";
import { cn } from "@/lib/utils";
import type { FlashcardsContent, StudioArtifactViewMode } from "@/types";

const STACK_VISIBLE_RANGE = 3;
const STACK_SPRING = {
  type: "spring" as const,
  stiffness: 260,
  damping: 25,
  mass: 0.8,
};

function getStackTransform(diff: number) {
  if (diff === 0) {
    return { x: 0, z: 0, rotateZ: 0, opacity: 1 };
  }

  const absDiff = Math.abs(diff);
  const side = diff < 0 ? -1 : 1;

  return {
    x: `${side * (3 + absDiff * 8)}%`,
    z: -140 - absDiff * 20,
    rotateZ: side * (4 + absDiff * 2),
    opacity: 1 / 3 ** absDiff,
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function FlashcardFace({
  label,
  icon: Icon,
  labelClassName,
  className,
  children,
  footer,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  labelClassName: string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-between rounded-3xl p-6 ring-5 ring-muted/50 [backface-visibility:hidden]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between font-medium text-xs uppercase tracking-wider",
          labelClassName,
        )}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="text-xs text-muted-foreground/50">Tap to flip</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto py-4">
        {children}
        {footer}
      </div>
    </div>
  );
}

function FlashcardStackCard({
  card,
  isCurrent,
  flipped,
  onShowHint,
}: {
  card: FlashcardDeckItem;
  isCurrent: boolean;
  flipped: boolean;
  onShowHint: () => void;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full rounded-3xl border border-border shadow-lg [transform-style:preserve-3d]",
        isCurrent ? "bg-card" : "bg-muted border-border/70",
        card.sourceColor && isCurrent && !flipped && "border-l-4",
      )}
      style={
        card.sourceColor && isCurrent && !flipped
          ? { borderLeftColor: card.sourceColor }
          : undefined
      }
    >
      <FlashcardFace
        label="Question"
        icon={HelpCircle}
        labelClassName="text-primary"
        className="bg-card "
        footer={
          isCurrent && card.hint ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onShowHint();
              }}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-500 text-xs transition-colors hover:bg-amber-500/20 cursor-pointer"
            >
              <Lightbulb className="size-3.5" />
              Need a hint?
            </button>
          ) : null
        }
      >
        <MessageResponse className="prose prose-sm dark:prose-invert max-w-md border-0 bg-transparent p-0 text-center text-base leading-relaxed md:text-xl [&_*]:text-center [&_p]:font-medium">
          {card.front}
        </MessageResponse>
      </FlashcardFace>

      <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
        <FlashcardFace
          label="Answer"
          icon={CheckCircle}
          labelClassName="text-emerald-500"
          className="bg-muted"
        >
          <MessageResponse className="prose prose-sm dark:prose-invert max-w-md border-0 bg-transparent p-0 text-center text-base leading-relaxed md:text-xl [&_*]:text-center">
            {card.back}
          </MessageResponse>
        </FlashcardFace>
      </div>
    </div>
  );
}

function FlashcardSourceActions({
  card,
  onViewSource,
  onAskInChat,
}: {
  card: FlashcardDeckItem;
  onViewSource: () => void;
  onAskInChat: () => void;
}) {
  return (
    <div className="relative z-20 flex flex-wrap justify-center gap-2">
      {card.sourceId && card.sourceTitle ? (
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
    </div>
  );
}

function FlashcardEmojiRating({
  onRate,
}: {
  onRate: (rating: FlashcardRating) => void;
}) {
  return (
    <div className="relative z-20 flex flex-col items-center gap-2">
      <p className="text-muted-foreground text-xs">How did it go?</p>
      <div className="flex gap-2">
        {FLASHCARD_EMOJI_RATINGS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onRate(option.id)}
            className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-2xl transition-transform hover:scale-110 hover:bg-muted cursor-pointer"
            aria-label={`Rate ${option.id}`}
          >
            {option.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function getFlashcardFilterLabel(
  value: string | null,
  options: { value: FlashcardFilterId; label: string }[],
): string {
  if (!value || value === "all") {
    return "All cards";
  }

  return options.find((option) => option.value === value)?.label ?? "All cards";
}

function FlashcardSourceFilter({
  filterId,
  options,
  onChange,
  triggerClassName,
}: {
  filterId: FlashcardFilterId;
  options: { value: FlashcardFilterId; label: string }[];
  onChange: (filterId: FlashcardFilterId) => void;
  triggerClassName?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs">Cards to quiz</p>
      <Select
        value={filterId}
        onValueChange={(value) => onChange(value as FlashcardFilterId)}
      >
        <SelectTrigger className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder="Cards to quiz">
            {(value) => getFlashcardFilterLabel(value, options)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cards</SelectItem>
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

function FlashcardSessionComplete({
  cardsStudied,
  sessionStats,
  onRestart,
}: {
  cardsStudied: number;
  sessionStats: FlashcardSessionStats;
  onRestart: () => void;
}) {
  const ratedCount = FLASHCARD_EMOJI_RATINGS.reduce(
    (total, option) => total + sessionStats[option.id],
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Trophy className="size-7" />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground">All done!</h3>
        <p className="text-sm text-muted-foreground">
          You studied {cardsStudied} card{cardsStudied === 1 ? "" : "s"}.
        </p>
      </div>

      {ratedCount > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {FLASHCARD_EMOJI_RATINGS.map((option) =>
            sessionStats[option.id] > 0 ? (
              <div
                key={option.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm"
              >
                <span className="text-base">{option.emoji}</span>
                <span className="text-muted-foreground">
                  {sessionStats[option.id]}
                </span>
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      <Button onClick={onRestart} className="h-10 gap-2">
        <RotateCcw className="size-4" />
        Study again
      </Button>
    </div>
  );
}

export function FlashcardsViewer({
  content,
  artifactId,
  sources = [],
  mode = "studio",
}: {
  content: FlashcardsContent;
  artifactId?: string;
  sources?: FlashcardSourceRef[];
  mode?: StudioArtifactViewMode;
}) {
  const sourceRefs = useMemo(
    () => sources.map((source) => ({ id: source.id, title: source.title })),
    [sources],
  );
  const deck = useMemo(
    () => createDeck(content.cards, sourceRefs),
    [content.cards, sourceRefs],
  );

  const sourceFilterOptions = useMemo(
    () => buildSourceFilterOptions(deck, sourceRefs),
    [deck, sourceRefs],
  );

  const [filterId, setFilterId] = useState<FlashcardFilterId>("all");
  const [orderedQueue, setOrderedQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardsStudied, setCardsStudied] = useState(0);
  const [sessionStats, setSessionStats] = useState<FlashcardSessionStats>(
    createEmptySessionStats,
  );

  const openSource = useCitationStore((state) => state.openSource);
  const handleSubmit = useNotebookChatStore((state) => state.handleSubmit);
  const chatStatus = useNotebookChatStore((state) => state.chatStatus);

  const safeQueueIndex =
    orderedQueue.length === 0
      ? 0
      : Math.min(queueIndex, orderedQueue.length - 1);

  const cardIndex = orderedQueue[safeQueueIndex];
  const card = cardIndex === undefined ? undefined : deck[cardIndex];

  const progressPercent = orderedQueue.length
    ? ((safeQueueIndex + 1) / orderedQueue.length) * 100
    : 0;

  const isFirstCard = safeQueueIndex === 0;
  const isLastCard = safeQueueIndex >= orderedQueue.length - 1;

  const visibleStack = useMemo(
    () =>
      orderedQueue
        .map((queueCardIndex, index) => ({ queueCardIndex, index }))
        .filter(
          ({ index }) =>
            Math.abs(index - safeQueueIndex) <= STACK_VISIBLE_RANGE,
        ),
    [orderedQueue, safeQueueIndex],
  );

  const persistProgress = useCallback(
    (
      updater:
        | Record<number, FlashcardProgress>
        | ((
            current: Record<number, FlashcardProgress>,
          ) => Record<number, FlashcardProgress>),
    ) => {
      if (!artifactId) {
        return;
      }

      const current = loadFlashcardProgress(artifactId);
      const next = typeof updater === "function" ? updater(current) : updater;
      saveFlashcardProgress(artifactId, next);
    },
    [artifactId],
  );

  const startSession = useCallback(
    (nextFilterId: FlashcardFilterId) => {
      const queue = shuffleIndices(buildStudyQueue(deck, nextFilterId));
      setOrderedQueue(queue);
      setQueueIndex(0);
      setFlipped(false);
      setSessionComplete(false);
      setCardsStudied(0);
      setSessionStats(createEmptySessionStats());
    },
    [deck],
  );

  const completeSession = useCallback(() => {
    setSessionComplete(true);
    setFlipped(false);
  }, []);

  const restartSession = useCallback(() => {
    startSession(filterId);
  }, [filterId, startSession]);

  const changeFilter = useCallback(
    (nextFilterId: string | null) => {
      if (!nextFilterId) {
        return;
      }

      const filter = nextFilterId as FlashcardFilterId;
      setFilterId(filter);
      startSession(filter);
    },
    [startSession],
  );

  useEffect(() => {
    setFilterId("all");
    startSession("all");
  }, [artifactId, content.cards, startSession]);

  const resetFlip = useCallback(() => setFlipped(false), []);

  const goNext = useCallback(() => {
    resetFlip();

    if (isLastCard) {
      completeSession();
      return;
    }

    setQueueIndex(safeQueueIndex + 1);
  }, [completeSession, isLastCard, resetFlip, safeQueueIndex]);

  const goPrev = useCallback(() => {
    if (isFirstCard) {
      return;
    }

    resetFlip();
    setQueueIndex(safeQueueIndex - 1);
  }, [isFirstCard, resetFlip, safeQueueIndex]);

  const rateCard = useCallback(
    (rating: FlashcardRating) => {
      if (!card) {
        return;
      }

      toast(getRatingToastMessage(rating), {
        duration: 1000,
        classNames: {
          toast: "sonnerLB-toast-shell",
          loader: "hidden",
        },
      });

      persistProgress((current) => ({
        ...current,
        [card.id]: scheduleReview(
          current[card.id] ?? defaultProgress(),
          rating,
        ),
      }));
      setCardsStudied((current) => current + 1);
      setSessionStats((current) => ({
        ...current,
        [rating]: current[rating] + 1,
      }));
      resetFlip();

      if (isLastCard) {
        completeSession();
        return;
      }

      setQueueIndex(safeQueueIndex + 1);
    },
    [
      card,
      completeSession,
      isLastCard,
      persistProgress,
      resetFlip,
      safeQueueIndex,
    ],
  );

  const showHint = useCallback(() => {
    if (!card?.hint) {
      toast("No hint for this card.");
      return;
    }

    toast(card.hint, {
      icon: <Lightbulb className="size-4 text-amber-500" />,
      duration: 3500,
      classNames: {
        toast: "sonnerLB-toast-shell",
        loader: "hidden",
      },
    });
  }, [card]);

  const handleViewSource = useCallback(() => {
    if (!card?.sourceId || !card.sourceTitle) {
      return;
    }

    openSource(card.sourceId, card.sourceTitle);
  }, [card, openSource]);

  const handleAskInChat = useCallback(async () => {
    if (!card) {
      return;
    }

    if (chatStatus === "streaming" || chatStatus === "submitted") {
      toast.error("Wait for the current response to finish.");
      return;
    }

    try {
      await handleSubmit({
        text: buildFlashcardChatPrompt(card),
        files: [],
      });
      toast.success("Question sent to chat");
    } catch {
      toast.error("Failed to send question to chat.");
    }
  }, [card, chatStatus, handleSubmit]);

  const toggleFlip = useCallback(() => {
    setFlipped((current) => !current);
  }, []);

  const keyboardRef = useRef({
    flipped,
    isFirstCard,
    isLastCard,
    sessionComplete,
    goNext,
    goPrev,
    rateCard,
    toggleFlip,
  });

  keyboardRef.current = {
    flipped,
    isFirstCard,
    isLastCard,
    sessionComplete,
    goNext,
    goPrev,
    rateCard,
    toggleFlip,
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        flipped: isFlipped,
        isFirstCard: atFirst,
        isLastCard: atLast,
        sessionComplete: isComplete,
        goNext: next,
        goPrev: prev,
        rateCard: rate,
        toggleFlip: flip,
      } = keyboardRef.current;

      if (isComplete || isEditableTarget(event.target)) {
        return;
      }

      if (isFlipped && ["1", "2", "3", "4"].includes(event.key)) {
        const rating = FLASHCARD_EMOJI_RATINGS[Number(event.key) - 1]?.id;
        if (rating) {
          event.preventDefault();
          rate(rating);
        }
        return;
      }

      switch (event.key) {
        case " ":
          event.preventDefault();
          flip();
          break;
        case "ArrowRight":
          next();
          break;
        case "ArrowLeft":
          if (!atFirst) {
            prev();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (deck.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No flashcards found.</p>
    );
  }

  if (orderedQueue.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <p className="font-medium text-sm text-foreground">
          No cards for this source.
        </p>
        <FlashcardSourceFilter
          filterId={filterId}
          options={sourceFilterOptions}
          onChange={changeFilter}
          triggerClassName="mx-auto"
        />
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <FlashcardSessionComplete
        cardsStudied={cardsStudied || orderedQueue.length}
        sessionStats={sessionStats}
        onRestart={restartSession}
      />
    );
  }

  if (!card) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div className="relative z-20 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm text-foreground">
            Card {safeQueueIndex + 1} of {orderedQueue.length}
          </p>
          <p className="text-muted-foreground text-xs">
            {flipped
              ? "Pick an emoji"
              : isLastCard
                ? "Last card — tap Next to finish"
                : "Tap the card to see the answer"}
          </p>
        </div>
      </div>

      <FlashcardSourceFilter
        filterId={filterId}
        options={sourceFilterOptions}
        onChange={changeFilter}
      />

      <div className="relative z-20 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="relative z-20 flex items-center gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={isFirstCard || flipped}
          aria-label="Previous card"
          className="shrink-0"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="relative h-[24rem] flex-1 [perspective:1000px] [transform-style:preserve-3d] sm:h-[24rem]">
          {visibleStack.map(({ queueCardIndex, index }) => {
            const stackCard = deck[queueCardIndex];
            if (!stackCard) {
              return null;
            }

            const diff = index - safeQueueIndex;
            const isCurrent = diff === 0;
            const { x, z, rotateZ, opacity } = getStackTransform(diff);

            return (
              <motion.div
                key={`${index}-${queueCardIndex}`}
                initial={false}
                animate={{
                  x,
                  z,
                  rotateZ,
                  rotateY: isCurrent && flipped ? 180 : 0,
                  opacity,
                }}
                transition={STACK_SPRING}
                style={{
                  zIndex: 10 - Math.abs(diff),
                  pointerEvents: isCurrent ? "auto" : "none",
                }}
                className="absolute inset-0 m-auto h-[20rem] w-[18rem] cursor-pointer [transform-style:preserve-3d] sm:h-[24rem] sm:w-[24rem]"
                onClick={() => {
                  if (isCurrent) {
                    toggleFlip();
                  }
                }}
              >
                <FlashcardStackCard
                  card={stackCard}
                  isCurrent={isCurrent}
                  flipped={flipped}
                  onShowHint={showHint}
                />
              </motion.div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={flipped}
          aria-label={isLastCard ? "Finish session" : "Next card"}
          className="shrink-0"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {flipped ? (
        <div className="relative z-20 flex flex-col gap-3">
          <FlashcardEmojiRating onRate={rateCard} />
          {mode === "studio" ? (
            <FlashcardSourceActions
              card={card}
              onViewSource={handleViewSource}
              onAskInChat={handleAskInChat}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
