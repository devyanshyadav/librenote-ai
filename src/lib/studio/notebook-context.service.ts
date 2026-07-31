import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notebooks } from "@/db/schema";
import { getSelectedNotebookSourceIds } from "@/lib/sources/source.service";
import { ensureSourceDigest } from "@/lib/sources/source.service";
import { formatSectionNotesForModel } from "@/lib/sources/source-section-notes";
import { generateStructuredOutput } from "@/lib/ai/generate-structured-output";
import { truncateForLog } from "@/lib/studio/studio-journey-log-details";
import type { StudioJourneyLog } from "@/lib/studio/studio-journey-log";
import type { NotebookBrief, SourceNote, StudioBriefCache } from "@/types";
import { runWithConcurrency } from "@/utils/async/run-with-concurrency";

const SOURCE_DIGEST_CONCURRENCY = 3;

const notebookSynthesisSchema = z.object({
  synthesis: z.string(),
  topics: z.array(z.string()),
});

const SYNTHESIS_SYSTEM = `You synthesize structured section notes from multiple research sources into a unified notebook brief using dense compression — not high-level summarization.

Compression technique:
- Preserve every substantive fact, name, number, and nuance from all sources; compress phrasing, do not omit content
- Remove filler grammar and redundancy; use tight telegraphic language where meaning stays intact
- Give every source proportional weight — do not over-index on one source or skip another
- Highlight agreements, contradictions, and each source's unique contribution with specifics intact
- Extract topics from the full breadth of the material; do not cap or truncate the topic list artificially
- Do not invent information beyond what the section notes contain.`;

function briefFingerprint(sources: SourceNote[]): string {
  return [...sources]
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
    .map((source) => `${source.sourceId}:${source.notes.length}`)
    .join("|");
}

function toNotebookBrief(
  sources: SourceNote[],
  synthesis: string,
  topics: string[],
): NotebookBrief {
  return { sources, synthesis, topics };
}

export async function getNotebookBrief(
  userId: string,
  notebookId: string,
  log: StudioJourneyLog,
  preferredSourceIds?: string[],
): Promise<NotebookBrief> {
  log.step("brief", "Loading selected sources");

  const sourceIds = await getSelectedNotebookSourceIds(
    notebookId,
    preferredSourceIds,
  );

  if (sourceIds.length === 0) {
    log.fail("brief", "No selected ready sources found");
    throw new Error("Select at least one ready source to use Studio.");
  }

  log.step("brief", `Preparing ${sourceIds.length} source digests`, {
    sourceIds,
  });

  const sources = await runWithConcurrency(
    sourceIds,
    SOURCE_DIGEST_CONCURRENCY,
    async (sourceId) => {
      const digest = await ensureSourceDigest(
        userId,
        sourceId,
        log.branch({ sourceId }),
      );

      const notes = formatSectionNotesForModel(
        digest.title,
        digest.sectionNotes,
      );

      return {
        sourceId: digest.sourceId,
        title: digest.title,
        notes,
      };
    },
  );

  log.step("brief", "All source notes loaded", {
    sources: sources.map((source) => ({
      sourceId: source.sourceId,
      title: source.title,
      notesChars: source.notes.length,
    })),
  });

  const fingerprint = briefFingerprint(sources);

  const [notebook] = await db
    .select({ studioBriefCache: notebooks.studioBriefCache })
    .from(notebooks)
    .where(eq(notebooks.id, notebookId))
    .limit(1);

  const cached = notebook?.studioBriefCache as StudioBriefCache | null;

  if (cached?.fingerprint === fingerprint) {
    log.success("brief", "Using cached notebook brief", {
      topicCount: cached.topics.length,
      synthesisChars: cached.synthesis.length,
      synthesisPreview: truncateForLog(cached.synthesis),
      topics: cached.topics,
    });

    const brief = toNotebookBrief(sources, cached.synthesis, cached.topics);
    return brief;
  }

  log.step("brief", "Synthesizing cross-source notebook brief", {
    sourceCount: sources.length,
    inputChars: sources.reduce(
      (total, source) => total + source.notes.length,
      0,
    ),
  });

  try {
    const synthesisPrompt = `Synthesize ${sources.length} sources:\n\n${sources
      .map((source) => `## ${source.title}\n${source.notes}`)
      .join("\n\n")}`;

    log.step("brief", "Brief synthesis prompt", {
      promptChars: synthesisPrompt.length,
      promptPreview: truncateForLog(synthesisPrompt, 1_200),
    });

    const { output: object } = await generateStructuredOutput({
      schema: notebookSynthesisSchema,
      schemaName: "NotebookBrief",
      schemaDescription: "Cross-source synthesis and topic list",
      system: SYNTHESIS_SYSTEM,
      prompt: synthesisPrompt,
    });

    const synthesis = object.synthesis.trim();
    const topics = object.topics;

    log.step("brief", "Brief synthesis result", {
      synthesisChars: synthesis.length,
      synthesisPreview: truncateForLog(synthesis),
      topicCount: topics.length,
      topics,
    });

    await db
      .update(notebooks)
      .set({
        studioBriefCache: { fingerprint, synthesis, topics },
        updatedAt: new Date(),
      })
      .where(eq(notebooks.id, notebookId));

    log.success("brief", "Notebook brief ready", {
      topics: topics.length,
      synthesisChars: synthesis.length,
    });

    const brief = toNotebookBrief(sources, synthesis, topics);
    return brief;
  } catch (error) {
    log.fail("brief", "Notebook brief synthesis failed", error);
    throw error;
  }
}
