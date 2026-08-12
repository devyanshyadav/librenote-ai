import { isStepCount, type StopCondition, type ToolSet } from "ai";
import type z from "zod";
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
import { DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE } from "@/lib/studio/visual-flow.constants";
// import { stepCountIs } from "ai";
import { getDiagramExampleTool } from "@/lib/studio/visual-flow-options";
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
  visualFlowContentSchema,
} from "@/types";

// const REPORT_MAX_STEPS = 20;

const ARTIFACT_TITLE_RULE =
  "Include a concise, descriptive title that names the main topic from the notebook (never a generic label like 'Flashcards', 'Quiz', or 'Mind Map').";

const SCHEMA_OUTPUT_RULE =
  "Output must match the schema exactly — use only defined fields, correct types, and valid enum values. Do not add extra keys or nest fields differently than the schema specifies.";

const AUDIO_NARRATOR_SYSTEM = `You write a spoken summary script from research notebook content.
${ARTIFACT_TITLE_RULE}
${SCHEMA_OUTPUT_RULE}

Write for listening: short sentences, smooth transitions, natural phrasing, and no markdown.
Stay grounded in the notebook brief. Cover synthesis, major themes, and notable source details.
Include an opening, body, and close. Use 2–12 lines. Every line must use the speaker "narrator".`;

const AUDIO_PODCAST_SYSTEM = `You write a discussion script for two presenters (Host and Co-host) based on research notebook content.
${ARTIFACT_TITLE_RULE}
${SCHEMA_OUTPUT_RULE}

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
${SCHEMA_OUTPUT_RULE}
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
    schemaDescription:
      "Study flashcard deck: title plus cards array. Each card has front, back, optional hint/topic/sourceId/difficulty.",
    system: (ctx) => {
      const base = `You create study flashcards from research notebook content.
${ARTIFACT_TITLE_RULE}
${SCHEMA_OUTPUT_RULE}
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
      "Quiz: title plus questions array. Each question has question, exactly 4 options, correctIndex (0–3), explanation, optional sourceId/citationQuote.",
    system: (ctx) => {
      const base = `You create multiple-choice quiz questions from research notebook content.
${ARTIFACT_TITLE_RULE}
${SCHEMA_OUTPUT_RULE}
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
      "Research report: title, summary, tags, optional banner, sections array. Sections use type key_takeaways, text_section, or chart.",
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
      "Data table: title, optional description/tableKind, columns (≥2), rows with cells matching column count. Cells may be strings or { value, format?, badgeTone?, sourceId? }.",
    system: (ctx) => {
      const base = `You extract structured tabular data from research notebook content.
${ARTIFACT_TITLE_RULE}
${SCHEMA_OUTPUT_RULE}

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
      'Mind map tree: title, nodes[{ id, data: { label, summary, sourceId? } }], edges[{ id, source, target }]. Root id must be "root".',
    system: (ctx) => {
      const base = `You create mind maps from research notebook content.
${ARTIFACT_TITLE_RULE}
${SCHEMA_OUTPUT_RULE}
Each node: { id, data: { label, summary, sourceId? } }. Each edge: { id, source, target }.
Build one tree: edge source is the parent, target is the child. Root id "root".
Drill down recursively (root → themes → sub-themes → details).
Use source-specific labels — not generic titles like "Overview" or "Key Points".
Every non-root node needs a short label (≤6 words) and 1–2 sentence summary in data.summary.
Set data.sourceId when a node is primarily from one source.

Clarity and layout rules (critical):
- Prioritize insight over exhaustiveness — each node should answer "so what?" for its branch.
- Keep the map clean: merge related ideas instead of spawning redundant sibling nodes.
- Limit fan-out: 2–4 children per parent; never put more than 5 siblings on one level.
- Avoid clutter: no duplicate concepts, no overlapping branches, no filler nodes.
- Balance depth across branches — do not let one limb balloon while others stay shallow.
- Labels must be distinct at every level so branches are easy to scan at a glance.`;
      const instructions = buildMindMapInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief) =>
      `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

Create a mind map from all selected sources.
Root id must be "root". Every non-root node needs exactly one edge from its parent.
Set data.sourceId on nodes grounded in a single source.
Keep the structure clean and scannable: insightful labels, balanced branching, no redundant or overlapping branches.`,
  },
  audio_overview: {
    title: "Audio Overview",
    schema: audioOverviewScriptSchema,
    schemaDescription:
      'Audio script: title, optional description, optional hosts (podcast), lines[{ speaker: "narrator"|"host"|"cohost", text }]. No format or playback fields.',
    system: (ctx) => {
      const isPodcast = ctx?.options?.audioOverviewFormat === "podcast";
      const base = isPodcast ? AUDIO_PODCAST_SYSTEM : AUDIO_NARRATOR_SYSTEM;
      const instructions = buildAudioOverviewInstructionBlock(ctx?.options);

      return instructions ? `${base}\n\n${instructions}` : base;
    },
    buildUserPrompt: (brief, ctx) => {
      const isPodcast = ctx?.options?.audioOverviewFormat === "podcast";
      const formatRules = isPodcast
        ? 'Return hosts { host, cohost } with display names. Alternate speaker "host" and "cohost" on every line. Do not include format or playback.'
        : 'Use speaker "narrator" on every line. Omit hosts. Do not include format or playback.';

      return `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

${formatRules}
Create the script for ${brief.sources.length} source(s) and give each source proportional coverage.`;
    },
  },
  visual_flow: {
    title: "Diagrams & Visual Models",
    schema: visualFlowContentSchema,
    schemaDescription:
      "Universal Mermaid diagram mapping: title, description, diagramType (flowchart, sequence, class, er, c4, packet, state, journey, git, requirement, kanban, eventmodeling, gantt, timeline, pie, xychart, mindmap, sankey, quadrant, radar, treemap, venn, ishikawa), code (Mermaid syntax).",
    system: (ctx) => {
      const selectedType =
        ctx?.options?.visualFlowDiagramType ?? DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE;
      return `You are a helpful assistant.

CRITICAL RULES:
1. DIAGRAM QUERIES & SYNTAX RULES: You MUST generate a diagram of type "${selectedType}". First, call the 'getDiagramExample' tool with diagramType: "${selectedType}" to retrieve the syntax rules and multiple valid examples. Study the returned rules and different patterns carefully, and generate a customized, original diagram matching the user's specific request. Do not copy any example verbatim.
2. STRICT JSON FORMAT: You MUST generate a valid JSON object matching the requested output schema. Do not output any conversational introductions, greetings, markdown blocks (like \`\`\`json), or post-explanations. Your output must start with "{" and end with "}". Keep the JSON raw and clean.

Ensure the diagram content is highly accurate, insightful, and clean. The layout must be simple, meaningful, and uncluttered.
${ARTIFACT_TITLE_RULE}

### ABSOLUTE MERMAID SYNTAX LAWS:
1. Valid Header: Start with the correct header matching the requested diagramType (e.g., 'flowchart TD', 'sequenceDiagram', 'classDiagram', etc.). Never use 'graph TD' for flowcharts.
2. Quoted Labels: Wrap node/actor labels and message strings in double quotes: ID["Label Here"]. Use simple alphanumeric IDs only (no spaces, dashes, or slashes in IDs).
3. Line Breaks: Use '<br/>' for line breaks inside label strings. Never use actual raw newlines inside label strings.
4. Banned Characters:
   - Raw square brackets [ ] are BANNED inside node labels (replace with round brackets () or single quotes).
   - Middle-dot · and non-ASCII math symbols (×, ÷, ≤, ≥, etc.) are BANNED inside labels. Use ASCII equivalent operators (*, /, <=, >=).
5. Connector Syntax: Write connections cleanly line-by-line (e.g., A --> B). Do not group links (no 'A & B --> C').`;
    },
    buildUserPrompt: (brief, ctx) => {
      const selectedType =
        ctx?.options?.visualFlowDiagramType ?? DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE;
      return `${buildBriefContext(brief)}

Available source ids:
${buildSourceIdList(brief)}

Generate a valid, fully compileable Mermaid diagram based on the brief above.
IMPORTANT: You MUST generate a diagram of type "${selectedType}". Set the "diagramType" property in the output JSON to exactly "${selectedType}" and generate the corresponding code.
Strictly adhere to the banned character rules (no raw [ ] or ·), line break constraints, and double-quoting to ensure a flawless render.`;
    },
    tools: {
      getDiagramExample: getDiagramExampleTool,
    },
    stopWhen: isStepCount(6),
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
