import type { QuizContent } from "@/types";
import { getSourceColor } from "@/lib/studio/flashcard-study";

export type QuizFilterId = "all" | `source:${string}`;

export interface QuizSourceRef {
  id: string;
  title: string;
}

export interface QuizFilterOption {
  value: QuizFilterId;
  label: string;
}

export interface QuizQuestionItem {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceColor?: string;
  citationQuote?: string;
}

export function createQuizDeck(
  questions: QuizContent["questions"],
  sources: QuizSourceRef[] = [],
): QuizQuestionItem[] {
  return questions.map((item, id) => {
    const sourceTitle = item.sourceId
      ? sources.find((source) => source.id === item.sourceId)?.title
      : undefined;

    return {
      id,
      question: item.question,
      options: item.options,
      correctIndex: item.correctIndex,
      explanation: item.explanation,
      sourceId: item.sourceId,
      sourceTitle,
      sourceColor: item.sourceId
        ? getSourceColor(item.sourceId, sources)
        : undefined,
      citationQuote: item.citationQuote,
    };
  });
}

export function getQuizSources(
  questions: QuizQuestionItem[],
  sources: QuizSourceRef[],
): QuizSourceRef[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const seen = new Set<string>();
  const refs: QuizSourceRef[] = [];

  for (const question of questions) {
    if (!question.sourceId || seen.has(question.sourceId)) {
      continue;
    }

    seen.add(question.sourceId);
    refs.push({
      id: question.sourceId,
      title:
        sourceById.get(question.sourceId)?.title ??
        question.sourceTitle ??
        "Untitled source",
    });
  }

  return refs;
}

export function buildQuizSourceFilterOptions(
  deck: QuizQuestionItem[],
  sources: QuizSourceRef[],
): QuizFilterOption[] {
  return getQuizSources(deck, sources).map((source) => ({
    value: `source:${source.id}` as QuizFilterId,
    label: source.title,
  }));
}

export function buildQuizQueue(
  deck: QuizQuestionItem[],
  filterId: QuizFilterId,
): number[] {
  if (filterId.startsWith("source:")) {
    const sourceId = filterId.slice("source:".length);
    return deck.flatMap((question, index) =>
      question.sourceId === sourceId ? [index] : [],
    );
  }

  return deck.map((_, index) => index);
}

export function shuffleQuestionIndices(indices: number[]): number[] {
  const next = [...indices];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function buildWrongAnswerChatPrompt(
  question: QuizQuestionItem,
  selectedOption: number,
): string {
  const selected = question.options[selectedOption] ?? "Unknown";
  const correct = question.options[question.correctIndex] ?? "Unknown";

  const lines = [
    "I got this quiz question wrong. Help me understand why.",
    "",
    `Question: ${question.question}`,
    "",
    `My answer: ${selected}`,
    `Correct answer: ${correct}`,
    "",
    `Quiz explanation: ${question.explanation}`,
  ];

  if (question.citationQuote) {
    lines.push("", `Source excerpt: "${question.citationQuote}"`);
  }

  if (question.sourceTitle) {
    lines.push("", `Source: ${question.sourceTitle}`);
  }

  lines.push(
    "",
    "Why was my answer incorrect, and how should I think about this topic?",
  );

  return lines.join("\n");
}
