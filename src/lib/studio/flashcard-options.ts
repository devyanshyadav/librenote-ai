import type {
  FlashcardDifficulty,
  FlashcardDeckSize,
  StudioGenerateOptions,
} from "@/types";

export const FLASHCARD_DECK_SIZE_OPTIONS: {
  value: FlashcardDeckSize;
  label: string;
}[] = [
  { value: "fewer", label: "Fewer" },
  { value: "standard", label: "Standard" },
  { value: "more", label: "More" },
];

export const FLASHCARD_DIFFICULTY_OPTIONS: {
  value: FlashcardDifficulty;
  label: string;
}[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const DECK_SIZE_SYSTEM: Record<FlashcardDeckSize, string> = {
  fewer:
    "Deck size: Fewer — create a compact deck (roughly 8–15 cards) focused on the highest-signal concepts.",
  standard:
    "Deck size: Standard — create a balanced deck (roughly 15–25 cards) across the selected material.",
  more: "Deck size: More — create a thorough deck (roughly 25–40 cards) with broad coverage and depth.",
};

const DIFFICULTY_SYSTEM: Record<FlashcardDifficulty, string> = {
  easy: "Difficulty: Easy — favor straightforward recall, definitions, and core facts. Set difficulty to easy on each card.",
  medium:
    "Difficulty: Medium — mix recall with light application and connections. Set difficulty to medium on each card.",
  hard: "Difficulty: Hard — emphasize nuance, comparisons, edge cases, and synthesis. Set difficulty to hard on each card.",
};

export function buildFlashcardInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const parts: string[] = [];

  if (options?.flashcardDeckSize) {
    parts.push(DECK_SIZE_SYSTEM[options.flashcardDeckSize]);
  }

  if (options?.flashcardDifficulty) {
    parts.push(DIFFICULTY_SYSTEM[options.flashcardDifficulty]);
  }

  return parts.join("\n");
}
