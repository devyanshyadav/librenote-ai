import type {
  FlashcardsContent,
  NotebookBrief,
  SourceNote,
  SourceSectionNotes,
} from "@/types";

const DEFAULT_TRUNCATE = 280;
const PROMPT_PREVIEW_TRUNCATE = 1_200;
const NOTES_PREVIEW_TRUNCATE = 600;

export function truncateForLog(value: string, max = DEFAULT_TRUNCATE): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max)}…`;
}

export function summarizeSectionNotesForLog(
  sectionNotes: SourceSectionNotes[],
) {
  return sectionNotes.map((section, index) => ({
    section: index + 1,
    mainTopics: section.mainTopics,
    keyPointCount: section.keyPoints.length,
    keyPointsPreview: section.keyPoints.map((point) =>
      truncateForLog(point, 160),
    ),
    conclusionCount: section.conclusions.length,
    conclusionsPreview: section.conclusions.map((item) =>
      truncateForLog(item, 160),
    ),
  }));
}

export function summarizeSourceNoteForLog(source: SourceNote) {
  return {
    sourceId: source.sourceId,
    title: source.title,
    notesChars: source.notes.length,
    notesPreview: truncateForLog(source.notes, NOTES_PREVIEW_TRUNCATE),
  };
}

export function summarizeNotebookBriefForLog(brief: NotebookBrief) {
  return {
    sourceCount: brief.sources.length,
    topicCount: brief.topics.length,
    topics: brief.topics,
    synthesisChars: brief.synthesis.length,
    synthesisPreview: truncateForLog(brief.synthesis, NOTES_PREVIEW_TRUNCATE),
    sources: brief.sources.map(summarizeSourceNoteForLog),
  };
}

export function summarizeFlashcardPromptForLog(system: string, prompt: string) {
  return {
    systemChars: system.length,
    promptChars: prompt.length,
    promptPreview: truncateForLog(prompt, PROMPT_PREVIEW_TRUNCATE),
  };
}

export function summarizeFlashcardsOutputForLog(content: FlashcardsContent) {
  const bySourceId: Record<string, number> = {};

  for (const card of content.cards) {
    const key = card.sourceId ?? "unassigned";
    bySourceId[key] = (bySourceId[key] ?? 0) + 1;
  }

  return {
    title: content.title,
    cardCount: content.cards.length,
    bySourceId,
    sampleCards: content.cards.slice(0, 5).map((card, index) => ({
      index: index + 1,
      sourceId: card.sourceId ?? null,
      topic: card.topic ?? null,
      difficulty: card.difficulty ?? null,
      front: truncateForLog(card.front, 160),
      back: truncateForLog(card.back, 160),
      hint: card.hint ? truncateForLog(card.hint, 120) : null,
    })),
  };
}
