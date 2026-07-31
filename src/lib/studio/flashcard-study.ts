import type { FlashcardDifficulty, FlashcardsContent } from "@/types";

export type FlashcardRating = "again" | "hard" | "good" | "easy";

export type FlashcardFilterId = "all" | `source:${string}`;

export const FLASHCARD_EMOJI_RATINGS: {
  id: FlashcardRating;
  emoji: string;
}[] = [
  { id: "again", emoji: "😕" },
  { id: "hard", emoji: "😓" },
  { id: "good", emoji: "🙂" },
  { id: "easy", emoji: "🤩" },
];

export interface FlashcardFilterOption {
  value: FlashcardFilterId;
  label: string;
}

export interface FlashcardDeckItem {
  id: number;
  front: string;
  back: string;
  hint: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceColor?: string;
  difficulty?: FlashcardDifficulty;
}

export interface FlashcardProgress {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number;
  lastRating?: FlashcardRating;
}

export interface FlashcardSourceRef {
  id: string;
  title: string;
}

const STORAGE_PREFIX = "flashcard-progress:";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SOURCE_COLORS = [
  "#c4b8f2",
  "#7dd3a0",
  "#fbbf24",
  "#60a5fa",
  "#f472b6",
  "#fb923c",
];

export function createDeck(
  cards: FlashcardsContent["cards"],
  sources: FlashcardSourceRef[] = [],
): FlashcardDeckItem[] {
  return cards.map((card, id) => {
    const sourceTitle = card.sourceId
      ? sources.find((source) => source.id === card.sourceId)?.title
      : undefined;

    return {
      id,
      front: card.front,
      back: card.back,
      hint: card.hint ?? "",
      sourceId: card.sourceId,
      sourceTitle,
      sourceColor: card.sourceId
        ? getSourceColor(card.sourceId, sources)
        : undefined,
      difficulty: card.difficulty,
    };
  });
}

export function getSourceColor(
  sourceId: string,
  sources: FlashcardSourceRef[],
): string | undefined {
  const index = sources.findIndex((source) => source.id === sourceId);
  if (index === -1) {
    return undefined;
  }

  return SOURCE_COLORS[index % SOURCE_COLORS.length];
}

export function defaultProgress(): FlashcardProgress {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: 0,
  };
}

export function scheduleReview(
  progress: FlashcardProgress,
  rating: FlashcardRating,
  now = Date.now(),
): FlashcardProgress {
  let { easeFactor, intervalDays, repetitions } = progress;

  switch (rating) {
    case "again":
      repetitions = 0;
      intervalDays = 0;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      break;
    case "hard":
      repetitions = Math.max(1, repetitions);
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2) || 1);
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      break;
    case "good":
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 3;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
      }
      break;
    case "easy":
      repetitions += 1;
      easeFactor += 0.15;
      if (repetitions === 1) {
        intervalDays = 2;
      } else if (repetitions === 2) {
        intervalDays = 5;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor * 1.3));
      }
      break;
  }

  const nextReviewAt =
    rating === "again" ? now : now + intervalDays * MS_PER_DAY;

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt,
    lastRating: rating,
  };
}

export function buildSourceFilterOptions(
  deck: FlashcardDeckItem[],
  sources: FlashcardSourceRef[],
): FlashcardFilterOption[] {
  return getDeckSources(deck, sources).map((source) => ({
    value: `source:${source.id}` as FlashcardFilterId,
    label: source.title,
  }));
}

export function buildStudyQueue(
  cards: FlashcardDeckItem[],
  filterId: FlashcardFilterId,
): number[] {
  if (filterId.startsWith("source:")) {
    const sourceId = filterId.slice("source:".length);
    return cards.flatMap((card, index) =>
      card.sourceId === sourceId ? [index] : [],
    );
  }

  return cards.map((_, index) => index);
}

export function shuffleIndices(indices: number[]): number[] {
  const next = [...indices];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function loadFlashcardProgress(
  artifactId: string,
): Record<number, FlashcardProgress> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${artifactId}`);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Record<number, FlashcardProgress>;
  } catch {
    return {};
  }
}

export function saveFlashcardProgress(
  artifactId: string,
  progress: Record<number, FlashcardProgress>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${STORAGE_PREFIX}${artifactId}`,
    JSON.stringify(progress),
  );
}

export function getDeckSources(
  cards: FlashcardDeckItem[],
  sources: FlashcardSourceRef[],
): FlashcardSourceRef[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const seen = new Set<string>();
  const refs: FlashcardSourceRef[] = [];

  for (const card of cards) {
    if (!card.sourceId || seen.has(card.sourceId)) {
      continue;
    }

    seen.add(card.sourceId);
    refs.push({
      id: card.sourceId,
      title:
        sourceById.get(card.sourceId)?.title ??
        card.sourceTitle ??
        "Untitled source",
    });
  }

  return refs;
}

export function getEmojiForRating(rating: FlashcardRating): string {
  return (
    FLASHCARD_EMOJI_RATINGS.find((option) => option.id === rating)?.emoji ??
    "🙂"
  );
}

export const FLASHCARD_RATING_MESSAGES: Record<FlashcardRating, string> = {
  again: "Didn't know that one",
  hard: "That was tough",
  good: "Got it!",
  easy: "Too easy!",
};

export function getRatingToastMessage(rating: FlashcardRating): string {
  return `${FLASHCARD_RATING_MESSAGES[rating]} ${getEmojiForRating(rating)}`;
}

export type FlashcardSessionStats = Record<FlashcardRating, number>;

export function createEmptySessionStats(): FlashcardSessionStats {
  return { again: 0, hard: 0, good: 0, easy: 0 };
}

export function buildFlashcardChatPrompt(card: FlashcardDeckItem): string {
  const lines = [
    "Help me understand this flashcard from my notebook.",
    "",
    `Question: ${card.front}`,
    `Answer: ${card.back}`,
  ];

  if (card.hint) {
    lines.push("", `Hint: ${card.hint}`);
  }

  if (card.sourceTitle) {
    lines.push("", `Source: ${card.sourceTitle}`);
  }

  lines.push(
    "",
    "Explain the concept in simpler terms and how it connects to the broader topic.",
  );

  return lines.join("\n");
}
