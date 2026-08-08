import { z } from "zod";
import { KOKORO_AUDIO_LANGUAGE_CODES } from "@/lib/constants/kokoro.constants";

export const studioArtifactTypeSchema = z.enum([
  "mind_map",
  "report",
  "flashcards",
  "quiz",
  "data_table",
  "audio_overview",
  "visual_flow",
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
  "visual-flow",
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
  "visual-flow": "visual_flow",
  note: "note",
};

export const flashcardItemSchema = z.object({
  front: z
    .string()
    .describe("Question, term, or prompt shown on the front of the card."),
  back: z
    .string()
    .describe("Answer or explanation shown on the back of the card."),
  hint: z
    .string()
    .max(200)
    .optional()
    .describe(
      "Optional short nudge that helps recall without revealing the answer.",
    ),
  topic: z
    .string()
    .optional()
    .describe("Optional short topic label grouping related cards."),
  sourceId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "UUID of the source from the brief when the card is grounded in one source.",
    ),
  difficulty: flashcardDifficultySchema
    .optional()
    .describe("Optional difficulty: easy, medium, or hard."),
});

export const flashcardsContentSchema = z.object({
  title: z
    .string()
    .describe(
      "Descriptive deck title naming the notebook topic (not a generic label like 'Flashcards').",
    ),
  cards: z
    .array(flashcardItemSchema)
    .describe("Ordered list of study flashcards."),
});

export type FlashcardsContent = z.infer<typeof flashcardsContentSchema>;

export const quizQuestionSchema = z.object({
  question: z.string().describe("The multiple-choice question stem."),
  options: z
    .array(z.string())
    .length(4)
    .describe("Exactly four answer choices."),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .describe(
      "Zero-based index of the correct option in the options array (0–3).",
    ),
  explanation: z
    .string()
    .describe("Brief explanation of why the correct answer is right."),
  sourceId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "UUID of the source from the brief when the question is grounded in one source.",
    ),
  citationQuote: z
    .string()
    .max(300)
    .optional()
    .describe(
      "Short verbatim excerpt (≤300 chars) from the source supporting the correct answer.",
    ),
});

export const quizContentSchema = z.object({
  title: z
    .string()
    .describe(
      "Descriptive quiz title naming the notebook topic (not a generic label like 'Quiz').",
    ),
  questions: z.array(quizQuestionSchema).describe("Ordered quiz questions."),
});

export type QuizContent = z.infer<typeof quizContentSchema>;

export const reportChartDataPointSchema = z.object({
  label: z.string().describe("Category or axis label for this data point."),
  value: z.number().describe("Numeric value for this data point."),
});

export type ReportChartDataPoint = z.infer<typeof reportChartDataPointSchema>;

export const reportKeyTakeawayItemSchema = z.object({
  title: z.string().describe("Short headline for one key takeaway."),
  detail: z
    .string()
    .describe("One or two sentences expanding on the takeaway."),
});

export type ReportKeyTakeawayItem = z.infer<typeof reportKeyTakeawayItemSchema>;

export const reportBannerSchema = z.object({
  alt: z.string().describe("Short accessibility description of the banner image."),
  url: z.string().url().describe("HTTPS URL of the banner image."),
});

export type ReportBanner = z.infer<typeof reportBannerSchema>;

export const reportSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z
      .literal("key_takeaways")
      .describe("Section type: bullet list of key conclusions."),
    heading: z
      .string()
      .default("Key takeaways")
      .describe("Section heading (defaults to 'Key takeaways')."),
    items: z
      .array(reportKeyTakeawayItemSchema)
      .describe("Key takeaway items — use this section first in the report."),
  }),
  z.object({
    type: z
      .literal("text_section")
      .describe("Section type: prose body section with a heading."),
    heading: z.string().describe("Section heading."),
    content: z
      .string()
      .describe("Section body in plain prose (no markdown headings)."),
  }),
  z.object({
    type: z
      .literal("chart")
      .describe("Section type: inline chart with numeric data points."),
    chartTitle: z.string().describe("Title displayed above the chart."),
    chartId: z
      .string()
      .describe("Stable chart identifier (e.g. 'revenue-by-quarter')."),
    description: z
      .string()
      .optional()
      .describe("Optional caption or context for the chart."),
    dataPoints: z
      .array(reportChartDataPointSchema)
      .describe("Chart data — each point has a label and numeric value."),
  }),
]);

export type ReportSection = z.infer<typeof reportSectionSchema>;

export const reportContentSchema = z.object({
  title: z
    .string()
    .describe(
      "Report title naming the notebook topic (not a generic label like 'Report').",
    ),
  subtitle: z
    .string()
    .optional()
    .describe("Optional subtitle clarifying scope or angle."),
  summary: z
    .string()
    .describe("Executive summary paragraph synthesizing the full report."),
  tags: z
    .array(z.string())
    .describe("Short topic tags for navigation (3–8 items)."),
  banner: reportBannerSchema
    .nullish()
    .describe("Optional hero banner image — omit if no image is available."),
  sections: z
    .array(reportSectionSchema)
    .describe(
      "Ordered report sections. Start with key_takeaways, then text_section blocks.",
    ),
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
  value: z.string().describe("Cell display text."),
  format: dataTableCellFormatSchema
    .optional()
    .describe(
      'Cell format: "text" (plain), "markdown" (inline emphasis), or "badge" (status pill).',
    ),
  badgeTone: dataTableBadgeToneSchema
    .optional()
    .describe(
      'Badge color when format is "badge": neutral, success, warning, danger, or info.',
    ),
  sourceId: z
    .string()
    .uuid()
    .optional()
    .describe("UUID of the source when this cell is grounded in one source."),
  citationQuote: z
    .string()
    .max(300)
    .optional()
    .describe("Short supporting excerpt (≤300 chars) for this cell."),
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
  label: z.string().describe("Column header label."),
  kind: dataTableColumnKindSchema
    .optional()
    .describe(
      "Optional column kind hint: text, name, status, date, number, metric, source, or detail.",
    ),
});

export type DataTableColumn = z.infer<typeof dataTableColumnSchema>;

export const dataTableColumnDefSchema = z.union([
  z.string(),
  dataTableColumnSchema,
]);

export const dataTableRowSchema = z.object({
  cells: z
    .array(z.union([z.string(), dataTableCellSchema]))
    .describe(
      "One value per column, in column order. Use plain strings for simple text; use cell objects when format, badge, or sourceId is needed.",
    ),
  sourceId: z
    .string()
    .uuid()
    .optional()
    .describe("UUID of the primary source for the entire row."),
  rowLabel: z
    .string()
    .optional()
    .describe("Optional primary row title when it should stand apart from cells."),
});

export type DataTableRow = z.infer<typeof dataTableRowSchema>;

export const dataTableContentSchema = z.object({
  title: z
    .string()
    .describe(
      "Descriptive table title naming the notebook topic (not a generic label like 'Data Table').",
    ),
  description: z
    .string()
    .optional()
    .describe("Optional one-sentence summary of what the table compares."),
  tableKind: dataTableKindSchema
    .optional()
    .describe(
      "Table layout: comparison, timeline, entities, metrics, or custom.",
    ),
  columns: z
    .array(dataTableColumnDefSchema)
    .min(2)
    .describe(
      "Column definitions — at least 2. Each entry is a label string or { label, kind? } object.",
    ),
  rows: z
    .array(dataTableRowSchema)
    .min(1)
    .describe("Data rows — each row has a cells array matching column count."),
});

export type DataTableContent = z.infer<typeof dataTableContentSchema>;

export const mindMapNodeSchema = z.object({
  id: z
    .string()
    .describe(
      'Unique node id. Root must be exactly "root". Other ids: short slugs like "theme-1" or "detail-a".',
    ),
  data: z
    .object({
      label: z
        .string()
        .describe("Short display label (≤6 words) shown on the node."),
      summary: z
        .string()
        .describe(
          "1–2 sentence explanation shown in the detail panel when the node is selected.",
        ),
      sourceId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "UUID from the brief when this node is primarily grounded in one source.",
        ),
    })
    .describe(
      "Node payload — label and summary must be inside data, not at the top level.",
    ),
});

export const mindMapEdgeSchema = z.object({
  id: z
    .string()
    .describe('Unique edge id string (e.g. "edge-root-theme-1").'),
  source: z
    .string()
    .describe(
      "Parent node id from nodes — must exactly match an existing node id (edge goes parent → child).",
    ),
  target: z
    .string()
    .describe(
      "Child node id from nodes — must exactly match an existing node id and cannot be \"root\".",
    ),
});

export const mindMapContentSchema = z
  .object({
    title: z
      .string()
      .describe(
        "Descriptive mind map title naming the notebook topic (not a generic label like 'Mind Map').",
      ),
    nodes: z
      .array(mindMapNodeSchema)
      .min(3)
      .max(45)
      .describe(
        'All nodes. Required per node: { "id": string, "data": { "label": string, "summary": string, "sourceId"?: uuid } }. Never put label or summary on the node root — only inside data.',
      ),
    edges: z
      .array(mindMapEdgeSchema)
      .describe(
        "Tree edges only. One edge per non-root node (edges.length = nodes.length - 1). Each: { id, source: parentNodeId, target: childNodeId }. Every source/target must match a nodes[].id.",
      ),
  })
  .describe(
    'Single-root mind map tree. Include exactly one root node with id "root". Connect every other node with one edge from its parent.',
  );

export type MindMapContent = z.infer<typeof mindMapContentSchema>;

export const audioOverviewSpeakerSchema = z
  .enum(["narrator", "host", "cohost"])
  .describe(
    'Who speaks this line. Use "narrator" for single-voice overview scripts. Use "host" and "cohost" for podcast format — alternate between them across lines.',
  );

export type AudioOverviewSpeaker = z.infer<typeof audioOverviewSpeakerSchema>;

export const audioOverviewLineSchema = z.object({
  speaker: audioOverviewSpeakerSchema,
  text: z
    .string()
    .min(1)
    .max(1200)
    .describe(
      "Spoken line text. Plain language only — no markdown, stage directions, speaker prefixes, or sound effects.",
    ),
});

export type AudioOverviewLine = z.infer<typeof audioOverviewLineSchema>;

export const audioOverviewHostsSchema = z.object({
  host: z
    .string()
    .describe(
      "Display name for the host presenter (required for podcast format).",
    ),
  cohost: z
    .string()
    .describe(
      "Display name for the co-host presenter (required for podcast format).",
    ),
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
  title: z
    .string()
    .describe(
      "Descriptive script title naming the notebook topic (not a generic label like 'Audio Overview').",
    ),
  description: z
    .string()
    .optional()
    .describe("Optional one-sentence summary of what the audio covers."),
  format: audioOverviewFormatSchema.describe(
    'Audio format: "overview" (single narrator) or "podcast" (host + cohost dialogue). Set by the app — do not include in script generation output.',
  ),
  hosts: audioOverviewHostsSchema
    .optional()
    .describe(
      "Presenter display names. Required for podcast format; omit for single-narrator overview.",
    ),
  lines: z
    .array(audioOverviewLineSchema)
    .min(2)
    .max(12)
    .describe(
      'Ordered script lines (2–12). Each line has speaker and text. Overview: all lines use speaker "narrator". Podcast: alternate "host" and "cohost".',
    ),
  playback: audioOverviewPlaybackSchema
    .optional()
    .describe(
      "Audio timing metadata — generated by the app after TTS. Do not include in script generation output.",
    ),
});

export type AudioOverviewContent = z.infer<typeof audioOverviewContentSchema>;

export const audioOverviewScriptSchema = audioOverviewContentSchema
  .omit({
    format: true,
    playback: true,
  })
  .describe(
    "Spoken audio script. Return only title, optional description, optional hosts (podcast), and lines. Do not include format or playback.",
  );

export type AudioOverviewScript = z.infer<typeof audioOverviewScriptSchema>;

export const visualFlowContentSchema = z.object({
  title: z
    .string()
    .describe(
      "Descriptive visual flow title naming the notebook topic (not a generic label like 'Flowcharts & Diagrams').",
    ),
  description: z
    .string()
    .describe("One-sentence summary explaining the workflow or process flow represented."),
  diagramType: z
    .enum([
      "flowchart",
      "sequence",
      "class",
      "er",
      "c4",
      "architecture",
      "packet",
      "zenuml",
      "state",
      "journey",
      "git",
      "requirement",
      "kanban",
      "eventmodeling",
      "gantt",
      "timeline",
      "pie",
      "xychart",
      "mindmap",
      "sankey",
      "quadrant",
      "block",
      "radar",
      "treemap",
      "venn",
      "ishikawa",
    ])
    .describe("Mermaid diagram type that best visualizes the concept context."),
  code: z
    .string()
    .describe(
      "Strictly valid, compileable, and syntax-correct Mermaid.js diagram code. IMPORTANT rules:\n" +
      "1. Start with the correct header matching diagramType.\n" +
      "2. Wrap node/actor labels and message strings in double quotes: ID[\"Label Here\"]. Use alphanumeric IDs only.\n" +
      "3. NEVER use literal newlines inside label strings — use <br/> for line breaks.\n" +
      "4. Banned characters: Raw square brackets [ ] inside labels are BANNED. Middle-dot · and non-ASCII math symbols are BANNED.",
    ),
});

export type VisualFlowContent = z.infer<typeof visualFlowContentSchema>;

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
  | VisualFlowContent
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
  status: "pending" | "processing" | "completed" | "failed" | "timeout";
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
  | (StudioArtifactBase & {
      type: "visual_flow";
      content: VisualFlowContent | null;
    })
  | (StudioArtifactBase & { type: "note"; content: NoteContent | null });

export type StudioArtifactViewMode = "studio" | "standalone";
