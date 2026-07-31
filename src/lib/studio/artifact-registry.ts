import { type StopCondition, type ToolSet } from "ai";
// import { stepCountIs } from "ai";
import type { z } from "zod";
import { buildAudioOverviewInstructionBlock } from "@/lib/studio/audio-overview-options";
import { buildDataTableInstructionBlock } from "@/lib/studio/data-table-options";
import { buildFlashcardInstructionBlock } from "@/lib/studio/flashcard-options";
import { buildMindMapInstructionBlock } from "@/lib/studio/mind-map-options";
import {
  buildBriefContext,
  buildSourceIdList,
} from "@/lib/studio/notebook-brief-context";
import { buildQuizInstructionBlock } from "@/lib/studio/quiz-options";
import { buildReportInstructionBlock } from "@/lib/studio/report-options";
// import {
//   createStudioTools,
//   pickStudioTools,
// } from "@/lib/studio/studio-tool-registry";
import {
  audioOverviewScriptSchema,
  dataTableContentSchema,
  flashcardsContentSchema,
  mindMapContentSchema,
  type NotebookBrief,
  quizContentSchema,
  reportContentSchema,
  type StudioArtifactContext,
  type StudioGeneratedArtifactType,
} from "@/types";

// const REPORT_MAX_STEPS = 20;

const ARTIFACT_TITLE_RULE =
  "Include a concise, descriptive title that names the main topic from the notebook (never a generic label like 'Flashcards', 'Quiz', or 'Mind Map').";

const AUDIO_NARRATOR_SYSTEM = `You write a spoken summary script from research notebook content.
${ARTIFACT_TITLE_RULE}

Write for listening: short sentences, smooth transitions, natural phrasing, and no markdown.
Stay grounded in the notebook brief. Cover synthesis, major themes, and notable source details.
Include an opening, body, and close. Use 2–12 lines. Every line must use the speaker "narrator".`;

const AUDIO_PODCAST_SYSTEM = `You write a discussion script for two presenters (Host and Co-host) based on research notebook content.
${ARTIFACT_TITLE_RULE}

Write for listening: short sentences, natural flow, conversational tone, and no markdown.
Make it feel spoken, not scripted — reactions, follow-up questions, and pushback are welcome.
Let them weigh trade-offs, surface disagreements in the material, and land on a clear summary at the end.
Prioritize insight over recitation; explain what the findings mean, not just what they say.`;

type ArtifactTools = ToolSet | ((ctx: StudioArtifactContext) => ToolSet);

interface ArtifactConfig {
  title: string;
  schema: z.ZodType;
  schemaDescription?: string;
  system: string | ((ctx?: StudioArtifactContext) => string);
  buildUserPrompt: (
    brief: NotebookBrief,
    ctx?: StudioArtifactContext,
  ) => string;
  tools?: ArtifactTools;
  stopWhen?: StopCondition<ToolSet>;
}

interface ResolvedArtifactConfig
  extends Omit<ArtifactConfig, "tools" | "system"> {
  system: string;
  tools?: ToolSet;
}

function resolveArtifactTools(
  tools: ArtifactTools | undefined,
  ctx?: StudioArtifactContext,
): ToolSet | undefined {
  if (!tools) {
    return undefined;
  }

  if (typeof tools === "function") {
    if (!ctx) {
      return undefined;
    }

    return tools(ctx);
  }

  return tools;
}

const REPORT_SYSTEM = `You write detailed, well-structured research reports from notebook source material.
Aim for comprehensive coverage — include the major themes, supporting details, numbers, and nuance from the brief. Do not omit important material to keep the report short.
Keep prose clean and readable: clear headings, logical flow, and focused paragraphs — not unstructured dumps.

Return structured report data: title, summary, tags, optional banner, and an ordered sections array.

Section types (discriminated by "type"):
- key_takeaways — open with this; capture the most important conclusions across all sources
- text_section — in-depth thematic sections; build the report body from the synthesis, topics, and per-source section notes

Coverage rules:
- Scale depth and section count to the notebook — more sources and richer section notes mean a longer, more detailed report; do not use a fixed template or target length.
- Give every source proportional weight; do not favor one source or skip another.
- Use synthesis and topics for cross-cutting structure; use per-source section notes to ensure each source's contributions are fully represented.
- When topics or section notes cover distinct themes, give each its own text_section rather than merging unrelated material.

Writing rules:
- Be thorough where the sources support it — explain context, implications, and connections between ideas
- Synthesize across sources; surface agreements, tensions, contradictions, and gaps explicitly
- Include concrete numbers, dates, names, and examples when sources provide them
- Do not invent facts, citations, or statistics`;

const ARTIFACT_REGISTRY: Record<StudioGeneratedArtifactType, ArtifactConfig> = {
  flashcards: {
    title: "Flashcards",
    schema: flashcardsContentSchema,
    schemaDescription: "Study deck with a descriptive title and flashcards",
    system: (ctx) => {
      const base = `You create study flashcards from research notebook content.
${ARTIFACT_TITLE_RULE}
Each card should test one specific fact, concept, or relationship.
Keep fronts concise questions or terms; backs should be clear answers with enough detail to study from.
Each card must include a short hint: a helpful nudge that guides recall without revealing the answer.
Set sourceId when a card is primarily grounded in one source from the brief.
Add an optional short topic label and difficulty (easy, medium, hard).

Coverage rules:
- Scale the deck to the notebook — more sources and richer section notes mean more cards; do not use a fixed target count.
- Cover every source in the brief proportionally; do not favor one source or ignore another.
- Use the synthesis and topics for cross-source themes, and per-source section notes for source-specific cards.
- Do not invent information.`;
      const instructions = buildFlashcardInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief) =>
      `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

Create flashcards from the full notebook brief above.
Scale the deck to ${brief.sources.length} source(s) and the depth of their section notes.
Give each source proportional coverage — no source should be skipped or underrepresented.`,
  },
  quiz: {
    title: "Quiz",
    schema: quizContentSchema,
    schemaDescription:
      "Quiz with a descriptive title and multiple-choice questions",
    system: (ctx) => {
      const base = `You create multiple-choice quiz questions from research notebook content.
${ARTIFACT_TITLE_RULE}
Each question must have exactly 4 options and one correctly correct answer.
Include a short explanation for the correct answer.
Set sourceId when a question is primarily grounded in one source from the brief.
Add citationQuote: a short verbatim excerpt (under 300 chars) from that source supporting the correct answer.

Coverage rules:
- Scale the quiz to the notebook — more sources and richer section notes mean more questions; do not use a fixed target count.
- Cover every source in the brief proportionally; do not favor one source or ignore another.
- Use the synthesis and topics for cross-source questions, and per-source section notes for source-specific questions.
- Do not invent information.`;
      const instructions = buildQuizInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief) =>
      `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

Create quiz questions from the full notebook brief above.
Scale the quiz to ${brief.sources.length} source(s) and the depth of their section notes.
Give each source proportional coverage — no source should be skipped or underrepresented.`,
  },
  report: {
    title: "Report",
    schema: reportContentSchema,
    schemaDescription:
      "Comprehensive research report with metadata, takeaways, detailed text sections, and inline charts",
    system: (ctx) => {
      const instructions = buildReportInstructionBlock(ctx?.options);

      return instructions
        ? `${REPORT_SYSTEM}\n\n${instructions}`
        : REPORT_SYSTEM;
    },
    buildUserPrompt: (brief) =>
      `${buildBriefContext(brief)}

Generate a detailed research report from the full notebook brief above.
Cover the synthesis, topics, and per-source section notes thoroughly for ${brief.sources.length} source(s).
Give each source proportional coverage — no source should be skipped or underrepresented.`,
    // tools: (ctx) =>
    //   pickStudioTools(createStudioTools(ctx), [
    //     "getChartPayloadSpec",
    //     "generateImage",
    //   ]),
    // stopWhen: stepCountIs(REPORT_MAX_STEPS),
  },
  data_table: {
    title: "Data Table",
    schema: dataTableContentSchema,
    schemaDescription:
      "Structured comparison table with title, columns, source-linked rows",
    system: (ctx) => {
      const base = `You extract structured tabular data from research notebook content.
${ARTIFACT_TITLE_RULE}

Table design:
- Pick a tableKind: comparison (side-by-side entities), timeline (dates/events), entities (catalog of items), metrics (numbers/KPIs), or custom
- Define columns as objects with label and kind when helpful: name, status, date, number, metric, source, detail, or text
- Each row is one entity, event, concept, or comparison unit
- Use rowLabel for a primary row title when it should stand apart from the first column cell
- Scale row count to source richness — do not use a fixed row limit
- Keep values dense and factual; do not invent information

Cell formatting (always set explicitly on cell objects):
- format "text" for plain values
- format "markdown" when using **bold** or *italic* emphasis in value
- format "badge" with badgeTone for status, priority, stage, or enum-like values
- sourceId on cells grounded in a specific source (exact ids from the brief)
- citationQuote on cells that need a short supporting excerpt

Coverage rules:
- Give every source proportional representation in the table where the material supports rows
- Use synthesis and topics for cross-source rows; use per-source section notes for source-specific rows`;
      const instructions = buildDataTableInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief) =>
      `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

Create a data table from the full notebook brief above for ${brief.sources.length} source(s).
Choose the best tableKind for the material and give each source proportional coverage.`,
  },
  mind_map: {
    title: "Mind Map",
    schema: mindMapContentSchema,
    schemaDescription:
      "Mind map graph with a descriptive title, nodes, and edges",
    system: (ctx) => {
      const base = `You create mind map graphs from research notebook content.
${ARTIFACT_TITLE_RULE}
Use a central root node, branch nodes for major themes, and leaf nodes for details.
Build a strict tree: every non-root node must have exactly one "hierarchy" parent edge.
Add optional "supports", "contradicts", or "relates" edges only between nodes that are NOT parent-child.
Each node needs a short label and a 1-2 sentence summary grounded in the sources.
Set sourceId to the matching source id from the brief when a node is primarily from one source.
Keep labels short. Do not invent information.`;
      const instructions = buildMindMapInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief) =>
      `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

Create a mind map with a clear tree hierarchy from all selected sources.
The root node id must be "root".
Use hierarchy edges for the tree. Add up to 4 cross-links for agreements (supports) or tensions (contradicts) across branches.`,
  },
  audio_overview: {
    title: "Audio Overview",
    schema: audioOverviewScriptSchema,
    schemaDescription:
      "Spoken script with a single narrator or alternating presenters",
    system: (ctx) => {
      const isPodcast = ctx?.options?.audioOverviewFormat === "podcast";
      const base = isPodcast ? AUDIO_PODCAST_SYSTEM : AUDIO_NARRATOR_SYSTEM;
      const instructions = buildAudioOverviewInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief, ctx) => {
      const isPodcast = ctx?.options?.audioOverviewFormat === "podcast";
      const formatRules = isPodcast
        ? "Alternate host and cohost speakers, name both presenters, and keep the exchange conversational."
        : 'Use speaker "narrator" on every line.';

      return `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

${formatRules}
Create the script for ${brief.sources.length} source(s) and give each source proportional coverage.`;
    },
  },
};

export function getArtifactConfig(
  type: StudioGeneratedArtifactType,
  ctx?: StudioArtifactContext,
): ResolvedArtifactConfig {
  const config = ARTIFACT_REGISTRY[type];
  const baseSystem =
    typeof config.system === "function" ? config.system(ctx) : config.system;
  const customPrompt = ctx?.options?.customPrompt?.trim();

  return {
    ...config,
    system: customPrompt
      ? `${baseSystem}\n\nUser instructions:\n${customPrompt}`
      : baseSystem,
    buildUserPrompt: (brief) => config.buildUserPrompt(brief, ctx),
    tools: resolveArtifactTools(config.tools, ctx),
  };
}
