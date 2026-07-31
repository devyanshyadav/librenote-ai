import type {
  FlashcardDifficulty,
  QuizQuestionCount,
  StudioGenerateOptions,
} from "@/types";

export const QUIZ_QUESTION_COUNT_OPTIONS: {
  value: QuizQuestionCount;
  label: string;
}[] = [
  { value: "fewer", label: "Fewer" },
  { value: "standard", label: "Standard" },
  { value: "more", label: "More" },
];

export const QUIZ_DIFFICULTY_OPTIONS: {
  value: FlashcardDifficulty;
  label: string;
}[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const QUESTION_COUNT_SYSTEM: Record<QuizQuestionCount, string> = {
  fewer:
    "Question count: Fewer — create a short quiz (roughly 5–8 questions) focused on the most important ideas.",
  standard:
    "Question count: Standard — create a balanced quiz (roughly 10–15 questions) across the selected material.",
  more: "Question count: More — create a thorough quiz (roughly 18–25 questions) with broad coverage.",
};

const DIFFICULTY_SYSTEM: Record<FlashcardDifficulty, string> = {
  easy: "Difficulty: Easy — favor straightforward recall and clearly stated facts in the questions and distractors.",
  medium:
    "Difficulty: Medium — mix recall with application, comparison, and light inference.",
  hard: "Difficulty: Hard — emphasize nuance, edge cases, synthesis across sources, and plausible distractors.",
};

export function buildQuizInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const parts: string[] = [];

  if (options?.quizQuestionCount) {
    parts.push(QUESTION_COUNT_SYSTEM[options.quizQuestionCount]);
  }

  if (options?.quizDifficulty) {
    parts.push(DIFFICULTY_SYSTEM[options.quizDifficulty]);
  }

  return parts.join("\n");
}
