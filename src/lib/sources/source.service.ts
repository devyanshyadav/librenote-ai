import type { User } from "@supabase/supabase-js";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import type { Source } from "@/db/schema";
import { documentChunks, notebooks, sources } from "@/db/schema";
import {
  ingestLinkSource,
  ingestTextSource,
  ingestUploadedFile,
} from "@/lib/sources/source-ingest";
import { SOURCE_BULK_URL_CONCURRENCY } from "@/lib/constants";
import { assertNotebookOwner } from "@/lib/notebooks/notebook.service";
import {
  getSourceSectionNotes,
  hasValidSourceSectionNotes,
  isSectionNotesExtractedText,
  parseSectionNotesFromExtractedText,
  serializeSectionNotesToExtractedText,
} from "@/lib/sources/source-section-notes";
import type { SourceSummaryChunk } from "@/lib/sources/source-summary.service";
import {
  generateSourceSummaryFromChunks,
  reduceNotesToSourceGuide,
} from "@/lib/sources/source-summary.service";
import { parseEmbeddingVector } from "@/lib/sources/source-summary-centroid";
import { StudioJourneyLog } from "@/lib/studio/studio-journey-log";
import { summarizeSectionNotesForLog } from "@/lib/studio/studio-journey-log-details";
import type {
  BulkLinkImportResult,
  CreateSourceResult,
  EmbedSourceBatchResult,
  NotebookSource,
  NotebookSourceListItem,
  SourceDetail,
  SourceListMetadata,
  SourceMetadata,
  SourceSectionNotes,
} from "@/types";
import {
  getSourceIngestStatus,
  getSourceSummaryStatus,
  sourceMetadataSchema,
} from "@/types";
import { embedNextSourceBatch } from "@/utils/sources/ingest-source";
import { runWithConcurrency } from "@/utils/async/run-with-concurrency";
import { splitTextIntoChunks } from "@/utils/text-splitter";

const sourceListSelect = {
  id: sources.id,
  title: sources.title,
  type: sources.type,
  sourceUrl: sources.sourceUrl,
  summary: sources.summary,
  metadata: sources.metadata,
  isSelected: sources.isSelected,
  createdAt: sources.createdAt,
};

const sourceSidebarMetadata = sql<SourceListMetadata | null>`
  CASE
    WHEN ${sources.metadata} IS NULL THEN NULL
    ELSE jsonb_strip_nulls(
      jsonb_build_object(
        'ingestStatus', ${sources.metadata} -> 'ingestStatus',
        'ingestError', ${sources.metadata} -> 'ingestError',
        'faviconUrl', ${sources.metadata} -> 'faviconUrl',
        'thumbnailUrl', ${sources.metadata} -> 'thumbnailUrl',
        'hostname', ${sources.metadata} -> 'hostname',
        'siteName', ${sources.metadata} -> 'siteName',
        'description', ${sources.metadata} -> 'description',
        'channelName', ${sources.metadata} -> 'channelName',
        'durationSeconds', ${sources.metadata} -> 'durationSeconds'
      )
    )
  END
`.as("metadata");

const sourceSidebarListSelect = {
  id: sources.id,
  title: sources.title,
  type: sources.type,
  metadata: sourceSidebarMetadata,
  isSelected: sources.isSelected,
  createdAt: sources.createdAt,
};

function toNotebookSourceListItem(source: {
  id: string;
  title: string;
  type: Source["type"];
  metadata: SourceListMetadata | null;
  isSelected: boolean;
  createdAt: Date | string;
}): NotebookSourceListItem {
  const metadata = source.metadata;

  return {
    id: source.id,
    title: source.title,
    type: source.type,
    metadata,
    isSelected: source.isSelected,
    createdAt:
      source.createdAt instanceof Date
        ? source.createdAt.toISOString()
        : source.createdAt,
    ingestStatus: getSourceIngestStatus(metadata),
  };
}

function toNotebookSource(source: {
  id: string;
  title: string;
  type: Source["type"];
  sourceUrl: string | null;
  summary: string | null;
  metadata: Source["metadata"];
  isSelected: boolean;
  createdAt: Date | string;
}): NotebookSource {
  const metadata = source.metadata as NotebookSource["metadata"];

  return {
    id: source.id,
    title: source.title,
    type: source.type,
    sourceUrl: source.sourceUrl,
    summary: source.summary,
    metadata,
    isSelected: source.isSelected,
    createdAt:
      source.createdAt instanceof Date
        ? source.createdAt.toISOString()
        : source.createdAt,
    ingestStatus: getSourceIngestStatus(metadata),
    summaryStatus: getSourceSummaryStatus(source.summary, metadata),
  };
}

async function assertSourceOwner(
  sourceId: string,
  userId: string,
): Promise<void> {
  const [source] = await db
    .select({ id: sources.id })
    .from(sources)
    .innerJoin(notebooks, eq(sources.notebookId, notebooks.id))
    .where(and(eq(sources.id, sourceId), eq(notebooks.ownerId, userId)))
    .limit(1);

  if (!source) {
    throw new Error("Source not found");
  }
}

export async function listNotebookSources(
  userId: string,
  notebookId: string,
): Promise<NotebookSourceListItem[]> {
  await assertNotebookOwner(notebookId, userId);

  const notebookSources = await db
    .select(sourceSidebarListSelect)
    .from(sources)
    .where(eq(sources.notebookId, notebookId))
    .orderBy(sources.createdAt);

  return notebookSources.map((source) => toNotebookSourceListItem(source));
}

export async function getSourceById(
  userId: string,
  sourceId: string,
): Promise<NotebookSource> {
  await assertSourceOwner(sourceId, userId);

  const [source] = await db
    .select(sourceListSelect)
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) {
    throw new Error("Source not found");
  }

  return toNotebookSource(source);
}

export async function getSourceDetail(
  userId: string,
  sourceId: string,
): Promise<SourceDetail> {
  const source = await getSourceById(userId, sourceId);
  const chunks = await db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
    })
    .from(documentChunks)
    .where(eq(documentChunks.sourceId, sourceId))
    .orderBy(asc(documentChunks.chunkIndex));

  return {
    ...source,
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      metadata: chunk.metadata as SourceDetail["chunks"][number]["metadata"],
    })),
  };
}

async function getSourceChunksForSummary(
  sourceId: string,
): Promise<SourceSummaryChunk[]> {
  const rows = await db
    .select({
      id: documentChunks.id,
      chunkIndex: documentChunks.chunkIndex,
      content: documentChunks.content,
      embedding: documentChunks.embedding,
    })
    .from(documentChunks)
    .where(eq(documentChunks.sourceId, sourceId))
    .orderBy(asc(documentChunks.chunkIndex));

  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      chunkIndex: row.chunkIndex,
      content: row.content,
      embedding: parseEmbeddingVector(row.embedding),
    }));
  }

  const [source] = await db
    .select({
      extractedText: sources.extractedText,
    })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (
    !source?.extractedText?.trim() ||
    isSectionNotesExtractedText(source.extractedText)
  ) {
    throw new Error("No content available to summarize.");
  }

  return splitTextIntoChunks(source.extractedText).map((content, index) => ({
    id: `extracted-${index}`,
    chunkIndex: index,
    content,
    embedding: null,
  }));
}

async function getSourceChunkCount(sourceId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(documentChunks)
    .where(eq(documentChunks.sourceId, sourceId));

  return row?.count ?? 0;
}

const sourceDigestSelect = {
  id: sources.id,
  title: sources.title,
  summary: sources.summary,
  metadata: sources.metadata,
  extractedText: sources.extractedText,
  type: sources.type,
  sourceUrl: sources.sourceUrl,
  isSelected: sources.isSelected,
  createdAt: sources.createdAt,
};

async function getSourceDigestRow(sourceId: string, userId: string) {
  await assertSourceOwner(sourceId, userId);

  const [source] = await db
    .select(sourceDigestSelect)
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) {
    throw new Error("Source not found");
  }

  return {
    ...source,
    metadata: source.metadata as SourceMetadata | null,
  };
}

async function saveSourceDigest(
  sourceId: string,
  sectionNotes: SourceSectionNotes[],
  chunkCount: number,
  summary: string,
) {
  const [updated] = await db
    .update(sources)
    .set({
      summary,
      extractedText: serializeSectionNotesToExtractedText(
        sectionNotes,
        chunkCount,
      ),
    })
    .where(eq(sources.id, sourceId))
    .returning(sourceListSelect);

  if (!updated) {
    throw new Error("Failed to save source digest.");
  }

  return toNotebookSource(updated);
}

function logDigestSectionNotes(
  journey: StudioJourneyLog,
  title: string,
  sectionNotes: SourceSectionNotes[],
  origin: "cache" | "generated",
) {
  journey.step("digest", `Section notes retrieved (${origin}) for "${title}"`, {
    sectionCount: sectionNotes.length,
    sections: summarizeSectionNotesForLog(sectionNotes),
  });
}

export async function ensureSourceDigest(
  userId: string,
  sourceId: string,
  log?: StudioJourneyLog,
): Promise<{
  sourceId: string;
  title: string;
  sectionNotes: SourceSectionNotes[];
}> {
  const journey = log ?? StudioJourneyLog.create({ sourceId });
  journey.step("digest", "Checking source digest");

  const source = await getSourceDigestRow(sourceId, userId);

  if (toNotebookSource(source).ingestStatus !== "ready") {
    journey.fail("digest", `Source "${source.title}" is not ready`);
    throw new Error(`Source "${source.title}" is not ready.`);
  }

  const existingSectionNotes = getSourceSectionNotes(source.extractedText);
  const parsed = source.extractedText
    ? parseSectionNotesFromExtractedText(source.extractedText)
    : null;

  if (existingSectionNotes && source.summary?.trim() && parsed) {
    const expectedCount =
      source.metadata?.chunkCount ??
      source.metadata?.embeddedChunkCount ??
      (await getSourceChunkCount(sourceId));

    if (parsed.chunkCount === expectedCount) {
      journey.success("digest", `Using cached digest for "${source.title}"`, {
        sections: existingSectionNotes.length,
        chunks: expectedCount,
      });

      logDigestSectionNotes(
        journey,
        source.title,
        existingSectionNotes,
        "cache",
      );

      return {
        sourceId: source.id,
        title: source.title,
        sectionNotes: existingSectionNotes,
      };
    }
  }

  const chunks = await getSourceChunksForSummary(sourceId);
  const hasSections = hasValidSourceSectionNotes(
    source.extractedText,
    chunks.length,
  );

  journey.step(
    "digest",
    `Loaded ${chunks.length} chunks for "${source.title}"`,
    {
      hasSections,
      hasSummary: !!source.summary?.trim(),
    },
  );

  let sectionNotes = existingSectionNotes;
  let summary = source.summary?.trim() ?? "";

  if (!hasSections) {
    journey.step("digest", `Generating section notes for "${source.title}"`);
    const digest = await generateSourceSummaryFromChunks(source.title, chunks);
    sectionNotes = digest.sectionNotes;
    summary = digest.summary;
    journey.success("digest", `Section notes created for "${source.title}"`, {
      sections: sectionNotes.length,
    });
  } else if (!summary && sectionNotes) {
    journey.step("digest", `Generating prose summary for "${source.title}"`);
    summary = await reduceNotesToSourceGuide(source.title, sectionNotes);
    journey.success("digest", `Prose summary created for "${source.title}"`);
  }

  if (!sectionNotes) {
    journey.fail("digest", `No section notes for "${source.title}"`);
    throw new Error(`Could not build section notes for "${source.title}".`);
  }

  journey.step("digest", `Saving digest for "${source.title}"`);
  await saveSourceDigest(sourceId, sectionNotes, chunks.length, summary);

  logDigestSectionNotes(journey, source.title, sectionNotes, "generated");

  return {
    sourceId: source.id,
    title: source.title,
    sectionNotes,
  };
}

async function updateSourceSummaryStatus(
  sourceId: string,
  summaryStatus: "processing" | "failed" | null,
): Promise<NotebookSource> {
  const [current] = await db
    .select({ metadata: sources.metadata })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!current) {
    throw new Error("Source not found");
  }

  const metadata = {
    ...((current.metadata as SourceMetadata | null) ?? {}),
  };

  if (summaryStatus) {
    metadata.summaryStatus = summaryStatus;
  } else {
    delete metadata.summaryStatus;
  }

  const [updated] = await db
    .update(sources)
    .set({ metadata })
    .where(eq(sources.id, sourceId))
    .returning(sourceListSelect);

  if (!updated) {
    throw new Error("Failed to update source summary status.");
  }

  return toNotebookSource(updated);
}

export async function createSourceSummaryJob(
  userId: string,
  sourceId: string,
): Promise<NotebookSource> {
  const source = await getSourceById(userId, sourceId);

  if (source.summary?.trim()) {
    if (source.summaryStatus === "processing") {
      return updateSourceSummaryStatus(sourceId, null);
    }

    return source;
  }

  if (source.summaryStatus === "processing") {
    return source;
  }

  if (source.ingestStatus !== "ready") {
    throw new Error(`Source "${source.title}" is not ready.`);
  }

  return updateSourceSummaryStatus(sourceId, "processing");
}

export async function runSourceSummaryGeneration(
  userId: string,
  sourceId: string,
): Promise<NotebookSource> {
  try {
    await ensureSourceDigest(userId, sourceId);
    await updateSourceSummaryStatus(sourceId, null);
    return getSourceById(userId, sourceId);
  } catch (error) {
    await updateSourceSummaryStatus(sourceId, "failed");
    throw error;
  }
}

export async function updateSourceSelection(
  userId: string,
  sourceId: string,
  isSelected: boolean,
): Promise<{ id: string; isSelected: boolean }> {
  await assertSourceOwner(sourceId, userId);

  const [updated] = await db
    .update(sources)
    .set({ isSelected })
    .where(eq(sources.id, sourceId))
    .returning({
      id: sources.id,
      isSelected: sources.isSelected,
    });

  if (!updated) {
    throw new Error("Source not found");
  }

  return updated;
}

export async function updateAllSourceSelection(
  userId: string,
  notebookId: string,
  isSelected: boolean,
): Promise<{ isSelected: boolean }> {
  await assertNotebookOwner(notebookId, userId);

  await db
    .update(sources)
    .set({ isSelected })
    .where(eq(sources.notebookId, notebookId));

  return { isSelected };
}

export async function getSelectedNotebookSourceIds(
  notebookId: string,
  preferredSourceIds?: string[],
): Promise<string[]> {
  const notebookSources = await db
    .select({
      id: sources.id,
      metadata: sources.metadata,
    })
    .from(sources)
    .where(
      preferredSourceIds?.length
        ? and(
            eq(sources.notebookId, notebookId),
            inArray(sources.id, preferredSourceIds),
          )
        : and(eq(sources.notebookId, notebookId), eq(sources.isSelected, true)),
    );

  const readyIds = notebookSources
    .filter((source) => {
      const metadata = sourceMetadataSchema.safeParse(source.metadata);
      return (
        getSourceIngestStatus(metadata.success ? metadata.data : null) ===
        "ready"
      );
    })
    .map((source) => source.id);

  if (preferredSourceIds?.length) {
    const readySet = new Set(readyIds);
    const ordered = preferredSourceIds.filter((sourceId) =>
      readySet.has(sourceId),
    );

    if (ordered.length === 0) {
      throw new Error("Select at least one ready source to use Studio.");
    }

    return ordered;
  }

  return readyIds;
}

export async function embedSourceBatch(
  userId: string,
  sourceId: string,
): Promise<EmbedSourceBatchResult> {
  await assertSourceOwner(sourceId, userId);
  return embedNextSourceBatch(sourceId);
}

export async function importLinkSource(
  userId: string,
  notebookId: string,
  url: string,
  title?: string,
): Promise<CreateSourceResult> {
  await assertNotebookOwner(notebookId, userId);
  const { source } = await ingestLinkSource({
    userId,
    notebookId,
    url,
    title,
  });
  return { source: toNotebookSource(source) };
}

export async function importBulkLinkSources(
  userId: string,
  notebookId: string,
  urls: string[],
): Promise<BulkLinkImportResult> {
  await assertNotebookOwner(notebookId, userId);

  const uniqueUrls = [...new Set(urls.map((value) => value.trim()))].filter(
    Boolean,
  );

  const succeeded: BulkLinkImportResult["succeeded"] = [];
  const failed: BulkLinkImportResult["failed"] = [];

  const results = await runWithConcurrency(
    uniqueUrls,
    SOURCE_BULK_URL_CONCURRENCY,
    async (url) => {
      try {
        const result = await importLinkSource(userId, notebookId, url);
        return {
          ok: true as const,
          url,
          source: result.source,
        };
      } catch (error) {
        return {
          ok: false as const,
          url,
          error: error instanceof Error ? error.message : "Import failed.",
        };
      }
    },
  );

  for (const result of results) {
    if (result.ok) {
      succeeded.push({
        url: result.url,
        source: result.source,
      });
    } else {
      failed.push({
        url: result.url,
        error: result.error,
      });
    }
  }

  return { succeeded, failed };
}

export async function importTextSource(
  userId: string,
  notebookId: string,
  text: string,
  title?: string,
): Promise<CreateSourceResult> {
  await assertNotebookOwner(notebookId, userId);
  const { source } = await ingestTextSource({
    userId,
    notebookId,
    text,
    title,
  });
  return { source: toNotebookSource(source) };
}

export async function uploadSourceFile(
  user: User,
  notebookId: string,
  file: File,
  title?: string,
): Promise<CreateSourceResult> {
  await assertNotebookOwner(notebookId, user.id);
  const { source } = await ingestUploadedFile({
    user,
    notebookId,
    file,
    title,
  });
  return { source: toNotebookSource(source) };
}
