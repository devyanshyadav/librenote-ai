import { z } from "zod";
import { KOKORO_AUDIO_LANGUAGE_CODES } from "@/lib/constants/kokoro.constants";

export const studioArtifactTypeSchema = z.enum([
  "mind_map",
  "report",
  "flashcards",
  "quiz",
  "data_table",
  "audio_overview",
  "note",
]);

export type StudioArtifactType = z.infer<typeof studioArtifactTypeSchema>;

export type StudioGeneratedArtifactType = Exclude<StudioArtifactType, "note">;

export const audioOverviewFormatSchema = z.enum(["overview", "podcast"]);

export type AudioOverviewFormat = z.infer<typeof audioOverviewFormatSchema>;

export const audioPodcastStyleSchema = z.enum([
  "deep_dive",
  "brief",
  "critique",
  "debate",
]);

export type AudioPodcastStyle = z.infer<typeof audioPodcastStyleSchema>;

export const audioLengthSchema = z.enum(["short", "default", "long"]);

export type AudioLength = z.infer<typeof audioLengthSchema>;

export const audioLanguageSchema = z.enum(
  KOKORO_AUDIO_LANGUAGE_CODES as [
    (typeof KOKORO_AUDIO_LANGUAGE_CODES)[number],
    ...(typeof KOKORO_AUDIO_LANGUAGE_CODES)[number][],
  ],
);

export type AudioLanguage = z.infer<typeof audioLanguageSchema>;

export const mindMapDetailLevelSchema = z.enum(["shallow", "balanced", "deep"]);

export type MindMapDetailLevel = z.infer<typeof mindMapDetailLevelSchema>;

export const flashcardDeckSizeSchema = z.enum(["fewer", "standard", "more"]);

export type FlashcardDeckSize = z.infer<typeof flashcardDeckSizeSchema>;

export const quizQuestionCountSchema = z.enum(["fewer", "standard", "more"]);

export type QuizQuestionCount = z.infer<typeof quizQuestionCountSchema>;

export const flashcardDifficultySchema = z.enum(["easy", "medium", "hard"]);

export type FlashcardDifficulty = z.infer<typeof flashcardDifficultySchema>;

export const reportDetailLevelSchema = z.enum([
  "overview",
  "standard",
  "comprehensive",
]);

export type ReportDetailLevel = z.infer<typeof reportDetailLevelSchema>;

export const reportFormatSchema = z.enum([
  "executive_summary",
  "research_brief",
  "comparative_analysis",
  "literature_review",
  "case_study",
  "technical_deep_dive",
  "policy_brief",
  "swot_analysis",
  "recommendation_memo",
  "chronological_report",
]);

export type ReportFormat = z.infer<typeof reportFormatSchema>;

export const dataTableFormatSchema = z.enum([
  "comparison",
  "timeline",
  "entity_catalog",
  "metrics",
  "research_findings",
  "quotes_by_topic",
  "requirements_checklist",
  "pro_con",
  "glossary",
  "custom",
]);

export type DataTableFormat = z.infer<typeof dataTableFormatSchema>;

export const studioGenerateOptionsSchema = z.object({
  audioOverviewFormat: audioOverviewFormatSchema.optional(),
  audioPodcastStyle: audioPodcastStyleSchema.optional(),
  audioLength: audioLengthSchema.optional(),
  audioLanguage: audioLanguageSchema.optional(),
  mindMapDetailLevel: mindMapDetailLevelSchema.optional(),
  flashcardDeckSize: flashcardDeckSizeSchema.optional(),
  flashcardDifficulty: flashcardDifficultySchema.optional(),
  quizQuestionCount: quizQuestionCountSchema.optional(),
  quizDifficulty: flashcardDifficultySchema.optional(),
  reportDetailLevel: reportDetailLevelSchema.optional(),
  reportFormat: reportFormatSchema.optional(),
  dataTableLanguage: audioLanguageSchema.optional(),
  dataTableDetailLevel: reportDetailLevelSchema.optional(),
  dataTableFormat: dataTableFormatSchema.optional(),
  customPrompt: z.string().trim().max(2000).optional(),
});

export type StudioGenerateOptions = z.infer<typeof studioGenerateOptionsSchema>;

export type StudioArtifactContext = {
  userId: string;
  artifactId: string;
  options?: StudioGenerateOptions;
};

export const studioArtifactSlugSchema = z.enum([
  "mind-map",
  "report",
  "flashcards",
  "quiz",
  "data-table",
  "audio-overview",
  "note",
]);

export type StudioArtifactSlug = z.infer<typeof studioArtifactSlugSchema>;

export const studioGenerateArtifactRequestSchema = z.object({
  sourceIds: z.array(z.string().uuid()).min(1),
  options: studioGenerateOptionsSchema.optional(),
});

export type StudioGenerateArtifactRequest = z.infer<
  typeof studioGenerateArtifactRequestSchema
>;

export const studioArtifactRenameRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type StudioArtifactRenameRequest = z.infer<
  typeof studioArtifactRenameRequestSchema
>;

export const studioNoteInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().max(100_000).optional(),
});

export type StudioNoteInput = z.infer<typeof studioNoteInputSchema>;

export const STUDIO_ARTIFACT_SLUG_TO_TYPE: Record<
  StudioArtifactSlug,
  StudioArtifactType
> = {
  "mind-map": "mind_map",
  report: "report",
  flashcards: "flashcards",
  quiz: "quiz",
  "data-table": "data_table",
  "audio-overview": "audio_overview",
  note: "note",
};

export const flashcardItemSchema = z.object({
  front: z.string(),
  back: z.string(),
  hint: z.string().max(200).optional(),
  topic: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  difficulty: flashcardDifficultySchema.optional(),
});

export const flashcardsContentSchema = z.object({
  title: z.string(),
  cards: z.array(flashcardItemSchema),
});

export type FlashcardsContent = z.infer<typeof flashcardsContentSchema>;

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  sourceId: z.string().uuid().optional(),
  citationQuote: z.string().max(300).optional(),
});

export const quizContentSchema = z.object({
  title: z.string(),
  questions: z.array(quizQuestionSchema),
});

export type QuizContent = z.infer<typeof quizContentSchema>;

export const reportChartDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export type ReportChartDataPoint = z.infer<typeof reportChartDataPointSchema>;

export const reportKeyTakeawayItemSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

export type ReportKeyTakeawayItem = z.infer<typeof reportKeyTakeawayItemSchema>;

export const reportBannerSchema = z.object({
  alt: z.string(),
  url: z.string().url(),
});

export type ReportBanner = z.infer<typeof reportBannerSchema>;

export const reportSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("key_takeaways"),
    heading: z.string().default("Key takeaways"),
    items: z.array(reportKeyTakeawayItemSchema),
  }),
  z.object({
    type: z.literal("text_section"),
    heading: z.string(),
    content: z.string(),
  }),
  z.object({
    type: z.literal("chart"),
    chartTitle: z.string(),
    chartId: z.string(),
    description: z.string().optional(),
    dataPoints: z.array(reportChartDataPointSchema),
  }),
]);

export type ReportSection = z.infer<typeof reportSectionSchema>;

export const reportContentSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  summary: z.string(),
  tags: z.array(z.string()),
  banner: reportBannerSchema.nullish(),
  sections: z.array(reportSectionSchema),
});

export type ReportContent = z.infer<typeof reportContentSchema>;

export const dataTableKindSchema = z.enum([
  "comparison",
  "timeline",
  "entities",
  "metrics",
  "custom",
]);

export type DataTableKind = z.infer<typeof dataTableKindSchema>;

export const dataTableCellFormatSchema = z.enum(["text", "markdown", "badge"]);

export type DataTableCellFormat = z.infer<typeof dataTableCellFormatSchema>;

export const dataTableBadgeToneSchema = z.enum([
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
]);

export type DataTableBadgeTone = z.infer<typeof dataTableBadgeToneSchema>;

export const dataTableCellSchema = z.object({
  value: z.string(),
  format: dataTableCellFormatSchema.optional(),
  badgeTone: dataTableBadgeToneSchema.optional(),
  sourceId: z.string().uuid().optional(),
  citationQuote: z.string().max(300).optional(),
});

export type DataTableCell = z.infer<typeof dataTableCellSchema>;

export const dataTableColumnKindSchema = z.enum([
  "text",
  "name",
  "status",
  "date",
  "number",
  "metric",
  "source",
  "detail",
]);

export type DataTableColumnKind = z.infer<typeof dataTableColumnKindSchema>;

export const dataTableColumnSchema = z.object({
  label: z.string(),
  kind: dataTableColumnKindSchema.optional(),
});

export type DataTableColumn = z.infer<typeof dataTableColumnSchema>;

export const dataTableColumnDefSchema = z.union([
  z.string(),
  dataTableColumnSchema,
]);

export const dataTableRowSchema = z.object({
  cells: z.array(z.union([z.string(), dataTableCellSchema])),
  sourceId: z.string().uuid().optional(),
  rowLabel: z.string().optional(),
});

export type DataTableRow = z.infer<typeof dataTableRowSchema>;

export const dataTableContentSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  tableKind: dataTableKindSchema.optional(),
  columns: z.array(dataTableColumnDefSchema).min(2),
  rows: z.array(dataTableRowSchema).min(1),
});

export type DataTableContent = z.infer<typeof dataTableContentSchema>;

export const mindMapNodeSchema = z.object({
  id: z.string(),
  data: z.object({
    label: z.string(),
    summary: z.string(),
    sourceId: z.string().uuid().optional(),
  }),
});

export const mindMapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const mindMapContentSchema = z.object({
  title: z.string(),
  nodes: z.array(mindMapNodeSchema).min(3).max(45),
  edges: z.array(mindMapEdgeSchema),
});

export type MindMapContent = z.infer<typeof mindMapContentSchema>;

export const audioOverviewSpeakerSchema = z.enum([
  "narrator",
  "host",
  "cohost",
]);

export type AudioOverviewSpeaker = z.infer<typeof audioOverviewSpeakerSchema>;

export const audioOverviewLineSchema = z.object({
  speaker: audioOverviewSpeakerSchema,
  text: z.string().min(1).max(1200),
});

export type AudioOverviewLine = z.infer<typeof audioOverviewLineSchema>;

export const audioOverviewHostsSchema = z.object({
  host: z.string(),
  cohost: z.string(),
});

export type AudioOverviewHosts = z.infer<typeof audioOverviewHostsSchema>;

export const audioOverviewWordTimingSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
});

export type AudioOverviewWordTiming = z.infer<
  typeof audioOverviewWordTimingSchema
>;

export const audioOverviewTimelineSegmentSchema = z.object({
  speaker: audioOverviewSpeakerSchema,
  text: z.string(),
  startMs: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  lineStartIndex: z.number().int().nonnegative(),
  lineEndIndex: z.number().int().nonnegative(),
  words: z.array(audioOverviewWordTimingSchema).optional(),
});

export type AudioOverviewTimelineSegment = z.infer<
  typeof audioOverviewTimelineSegmentSchema
>;

export const audioOverviewPlaybackSchema = z.object({
  durationMs: z.number().nonnegative(),
  timeline: z.array(audioOverviewTimelineSegmentSchema),
});

export type AudioOverviewPlayback = z.infer<typeof audioOverviewPlaybackSchema>;

export const audioOverviewContentSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  format: audioOverviewFormatSchema,
  hosts: audioOverviewHostsSchema.optional(),
  lines: z.array(audioOverviewLineSchema).min(2).max(12),
  playback: audioOverviewPlaybackSchema.optional(),
});

export type AudioOverviewContent = z.infer<typeof audioOverviewContentSchema>;

export const audioOverviewScriptSchema = audioOverviewContentSchema.omit({
  format: true,
  playback: true,
});

export type AudioOverviewScript = z.infer<typeof audioOverviewScriptSchema>;

export const noteContentSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type NoteContent = z.infer<typeof noteContentSchema>;

export type StudioArtifactContent =
  | FlashcardsContent
  | QuizContent
  | ReportContent
  | DataTableContent
  | MindMapContent
  | AudioOverviewContent
  | NoteContent;

export interface SourceNote {
  sourceId: string;
  title: string;
  notes: string;
}

export interface NotebookBrief {
  sources: SourceNote[];
  synthesis: string;
  topics: string[];
}

export interface StudioBriefCache {
  fingerprint: string;
  synthesis: string;
  topics: string[];
}

export interface StudioArtifactListItem {
  id: string;
  notebookId: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: StudioArtifactType;
  createdAt: string;
  updatedAt: string;
}

interface StudioArtifactBase extends StudioArtifactListItem {
  fileUrl: string | null;
}

export type StudioArtifactItem =
  | (StudioArtifactBase & {
      type: "flashcards";
      content: FlashcardsContent | null;
    })
  | (StudioArtifactBase & { type: "quiz"; content: QuizContent | null })
  | (StudioArtifactBase & { type: "report"; content: ReportContent | null })
  | (StudioArtifactBase & {
      type: "data_table";
      content: DataTableContent | null;
    })
  | (StudioArtifactBase & { type: "mind_map"; content: MindMapContent | null })
  | (StudioArtifactBase & {
      type: "audio_overview";
      content: AudioOverviewContent | null;
    })
  | (StudioArtifactBase & { type: "note"; content: NoteContent | null });

export type StudioArtifactViewMode = "studio" | "standalone";
