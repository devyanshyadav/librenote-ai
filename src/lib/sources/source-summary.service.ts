/**
 * Source digest pipeline (map → store → guide)
 *
 * 1. MAP — split chunks into batches (SOURCE_SUMMARY_CHUNKS_PER_MAP_BATCH or char cap).
 *    One AI call per batch produces dense compressed notes. Every batch becomes
 *    one stored <section>. Nothing is merged at this stage — context is preserved
 *    for Studio/flashcards.
 *
 * 2. STORE — all batch sections are saved to `sources.extracted_text` as XML.
 *
 * 3. GUIDE — optional prose summary for the source viewer UI only. On very large
 *    documents, adjacent sections are pairwise-merged (guide input only) until
 *    small enough for one final guide call. Stored sections are never touched.
 */
import { z } from "zod";
import { generateStructuredOutput } from "@/lib/ai/generate-structured-output";
import {
  SOURCE_SUMMARY_CENTROID_ANCHORS_PER_BATCH,
  SOURCE_SUMMARY_CHUNKS_PER_MAP_BATCH,
  SOURCE_SUMMARY_GUIDE_REDUCE_TARGET,
  SOURCE_SUMMARY_MAP_BATCH_MAX_CHARS,
  SOURCE_SUMMARY_MAP_CONCURRENCY,
} from "@/lib/constants";
import {
  type CentroidChunk,
  computeGlobalCentroid,
  pickCentroidAnchors,
} from "@/lib/sources/source-summary-centroid";
import type { SourceSectionNotes } from "@/types";
import { runWithConcurrency } from "@/utils/async/run-with-concurrency";

export interface SourceSummaryChunk extends CentroidChunk {
  chunkIndex: number;
}

const sourceSummaryBatchNotesSchema = z.object({
  mainTopics: z
    .array(z.string())
    .describe("Short topic labels present in this batch only"),
  keyPoints: z
    .array(z.string())
    .describe(
      "Dense compressed factual lines — one per claim, finding, or detail from this batch; preserve all specifics",
    ),
  conclusions: z
    .array(z.string())
    .describe(
      "Dense compressed outcomes, implications, or recommendations stated in this batch only",
    ),
});

export type SourceSummaryBatchNotes = z.infer<
  typeof sourceSummaryBatchNotesSchema
>;

const sourceGuideSchema = z.object({
  summary: z
    .string()
    .describe(
      "Dense compressed source guide with **bold** for key terms; no headings or bullet lists",
    ),
});

const COMPRESSION_TECHNIQUE = `Compression technique (not high-level summarization):
- Preserve every fact, name, number, date, metric, relationship, and qualification from the source text
- Remove filler grammar, redundant verbs, articles, and rhetorical padding when meaning stays intact
- Use telegraphic phrasing: tight clauses, semicolon-separated facts, precise terms instead of long prose
- Do not omit "minor" details — if it appears in the batch text, it must appear in the output
- Do not generalize away specifics or replace concrete information with vague overview language
- Prefer many short dense key points over few broad summary lines`;

const MAP_SYSTEM = `You compress one batch of chunks from a longer document into dense structured notes.
You are NOT summarizing the whole document — only the chunks provided in this batch.
${COMPRESSION_TECHNIQUE}
Include a key point for every distinct fact, figure, experiment, metric, name, and claim in this batch.
Do not invent information. Use empty arrays only when a field truly has nothing in this batch.`;

const MERGE_FOR_GUIDE_SYSTEM = `You merge two adjacent section-note objects from the same document for guide generation only.
${COMPRESSION_TECHNIQUE}
Combine overlapping points into one tighter line only when they repeat the same fact.
Never drop a unique fact, name, number, date, or claim from either section.
Concatenate all unique key points and conclusions from both inputs.`;

const SOURCE_GUIDE_SYSTEM = `You write a dense compressed "Source guide" for a research notebook.
${COMPRESSION_TECHNIQUE}
Cover the document's purpose, ideas, methods, arguments, data, and conclusions — with full specificity, not a short overview.
Use **bold markdown** for important terms, names, and metrics.
Do not use headings, bullet lists, or phrases like "This document" or "The source".`;

function batchChunksForSummary(
  chunks: SourceSummaryChunk[],
): SourceSummaryChunk[][] {
  const batches: SourceSummaryChunk[][] = [];
  let currentBatch: SourceSummaryChunk[] = [];
  let currentChars = 0;

  for (const chunk of chunks) {
    const exceedsChunkLimit =
      currentBatch.length >= SOURCE_SUMMARY_CHUNKS_PER_MAP_BATCH;
    const exceedsCharLimit =
      currentBatch.length > 0 &&
      currentChars + chunk.content.length > SOURCE_SUMMARY_MAP_BATCH_MAX_CHARS;

    if (exceedsChunkLimit || exceedsCharLimit) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }

    currentBatch.push(chunk);
    currentChars += chunk.content.length;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

function buildMapPrompt(
  title: string,
  batch: SourceSummaryChunk[],
  anchors: CentroidChunk[],
  batchIndex: number,
  totalBatches: number,
): string {
  const anchorIds = new Set(anchors.map((anchor) => anchor.id));
  const chunkRange = batch.map((chunk) => chunk.chunkIndex + 1).join(", ");
  const anchorSection =
    anchors.length > 0
      ? `Representative excerpts from this batch:\n${anchors
          .map((anchor, index) => `[Anchor ${index + 1}] ${anchor.content}`)
          .join("\n\n")}\n\n`
      : "";

  const sectionText = batch
    .map((chunk) => {
      const label = anchorIds.has(chunk.id) ? " (anchor)" : "";
      return `[Chunk ${chunk.chunkIndex + 1}${label}]\n${chunk.content}`;
    })
    .join("\n\n");

  return `Document title: ${title}
Batch ${batchIndex + 1} of ${totalBatches} (chunks ${chunkRange})

${anchorSection}Text for this batch only — do not infer content from other batches:
${sectionText}`;
}

async function mapBatchToNotes(
  title: string,
  batch: SourceSummaryChunk[],
  batchIndex: number,
  totalBatches: number,
  globalCentroid: number[] | null,
): Promise<SourceSummaryBatchNotes> {
  const anchors =
    globalCentroid && SOURCE_SUMMARY_CENTROID_ANCHORS_PER_BATCH > 0
      ? pickCentroidAnchors(
          batch,
          globalCentroid,
          SOURCE_SUMMARY_CENTROID_ANCHORS_PER_BATCH,
        )
      : [];

  const { output } = await generateStructuredOutput({
    schema: sourceSummaryBatchNotesSchema,
    schemaName: "SectionNotes",
    schemaDescription:
      "Dense compressed notes for one batch of document chunks",
    system: MAP_SYSTEM,
    prompt: buildMapPrompt(title, batch, anchors, batchIndex, totalBatches),
  });
  return output;
}

async function mergeAdjacentNotesForGuide(
  title: string,
  left: SourceSummaryBatchNotes,
  right: SourceSummaryBatchNotes,
): Promise<SourceSummaryBatchNotes> {
  const { output } = await generateStructuredOutput({
    schema: sourceSummaryBatchNotesSchema,
    schemaName: "MergedSectionNotes",
    schemaDescription:
      "Merged adjacent section notes for guide generation input only",
    system: MERGE_FOR_GUIDE_SYSTEM,
    prompt: `Document title: ${title}\n\nMerge these two adjacent section-note objects:\n${JSON.stringify([left, right])}`,
  });
  return output;
}

/** Compacts notes for the UI guide only — stored sections are never modified. */
async function compactNotesForGuide(
  title: string,
  notes: SourceSummaryBatchNotes[],
): Promise<SourceSummaryBatchNotes[]> {
  let current = notes;

  while (current.length > SOURCE_SUMMARY_GUIDE_REDUCE_TARGET) {
    const pairs: [SourceSummaryBatchNotes, SourceSummaryBatchNotes | null][] =
      [];

    for (let index = 0; index < current.length; index += 2) {
      pairs.push([current[index], current[index + 1] ?? null]);
    }

    current = await runWithConcurrency(
      pairs,
      SOURCE_SUMMARY_MAP_CONCURRENCY,
      async ([left, right]) =>
        right ? mergeAdjacentNotesForGuide(title, left, right) : left,
    );
  }

  return current;
}

async function reduceNotesToGuide(
  title: string,
  notes: SourceSummaryBatchNotes[],
): Promise<string> {
  const guideInput =
    notes.length > SOURCE_SUMMARY_GUIDE_REDUCE_TARGET
      ? await compactNotesForGuide(title, notes)
      : notes;

  const {
    output: { summary },
  } = await generateStructuredOutput({
    schema: sourceGuideSchema,
    schemaName: "SourceGuide",
    schemaDescription: "Final notebook source guide paragraph",
    system: SOURCE_GUIDE_SYSTEM,
    prompt: `Document title: ${title}

Structured notes gathered from every batch of the document:
${JSON.stringify(guideInput)}`,
  });
  const trimmed = summary.trim();
  if (!trimmed) {
    throw new Error("Summary generation returned empty text.");
  }

  return trimmed;
}

async function generateSectionNotesFromChunks(
  title: string,
  chunks: SourceSummaryChunk[],
): Promise<SourceSectionNotes[]> {
  const contentChunks = chunks.filter(
    (chunk) => chunk.content.trim().length > 0,
  );

  if (contentChunks.length === 0) {
    throw new Error("No content available to summarize.");
  }

  const embeddings = contentChunks
    .map((chunk) => chunk.embedding)
    .filter((embedding): embedding is number[] => embedding !== null);

  const globalCentroid =
    embeddings.length > 0 ? computeGlobalCentroid(embeddings) : null;

  const batches = batchChunksForSummary(contentChunks);

  const batchNotes = await runWithConcurrency(
    batches,
    SOURCE_SUMMARY_MAP_CONCURRENCY,
    (batch, batchIndex) =>
      mapBatchToNotes(title, batch, batchIndex, batches.length, globalCentroid),
  );

  return batchNotes;
}

export async function reduceNotesToSourceGuide(
  title: string,
  sectionNotes: SourceSectionNotes[],
): Promise<string> {
  return reduceNotesToGuide(title, sectionNotes);
}

export async function generateSourceSummaryFromChunks(
  title: string,
  chunks: SourceSummaryChunk[],
): Promise<{ sectionNotes: SourceSectionNotes[]; summary: string }> {
  const sectionNotes = await generateSectionNotesFromChunks(title, chunks);
  const summary = await reduceNotesToGuide(title, sectionNotes);

  return { sectionNotes, summary };
}
