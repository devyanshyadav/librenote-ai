import { embedMany } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import type { Source } from "@/db/schema";
import { documentChunks, sources } from "@/db/schema";
import { getEmbeddingModel } from "@/lib/ai/openrouter";
import { getErrorMessage } from "@/lib/app-error";
import { createClient } from "@/lib/supabase/server";
import {
  SOURCE_DB_INSERT_BATCH_SIZE,
  SOURCE_EMBED_BATCH_SIZE,
  SOURCE_EMBED_MAX_RETRIES,
  SOURCE_EMBEDDING_DIMENSIONS,
} from "@/lib/constants";
import type {
  EmbedSourceBatchResult,
  SourceChunkMetadata,
  SourceIngestStatus,
  SourceMetadata,
} from "@/types";
import type { IngestChunkDraft } from "@/lib/chunks/ingest-drafts";
import { loadIngestChunkDrafts } from "@/lib/chunks/ingest-drafts";
import { prepareSourceText } from "@/utils/sources/prepare-source-text";
import { retryAsync } from "@/utils/async/retry-async";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";
import { iterateTextChunks, type TextChunkSlice } from "@/utils/text-splitter";

export interface IngestSourceInput {
  notebookId: string;
  title: string;
  type: Source["type"];
  extractedText: string;
  sourceUrl?: string | null;
  storagePath?: string | null;
  metadata?: SourceMetadata | null;
}

export interface CreatePendingSourceResult {
  source: Source;
}

interface PendingChunkBatch {
  startIndex: number;
  items: TextChunkSlice[];
}

interface ChunkInsertRow {
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: SourceChunkMetadata | null;
}

function collectChunkBatch(
  iterator: Generator<TextChunkSlice>,
  batchSize: number,
): PendingChunkBatch | null {
  const items: TextChunkSlice[] = [];
  let startIndex = -1;

  while (items.length < batchSize) {
    const next = iterator.next();
    if (next.done) {
      break;
    }

    if (startIndex === -1) {
      startIndex = next.value.index;
    }

    items.push(next.value);
  }

  if (items.length === 0) {
    return null;
  }

  return { startIndex, items };
}

function skipChunks(iterator: Generator<TextChunkSlice>, count: number): void {
  for (let index = 0; index < count; index += 1) {
    if (iterator.next().done) {
      return;
    }
  }
}

function assertEmbeddingDimensions(embeddings: number[][]): void {
  for (let index = 0; index < embeddings.length; index += 1) {
    const embedding = embeddings[index];
    if (embedding.length !== SOURCE_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding at index ${index}: expected ${SOURCE_EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}.`,
      );
    }
  }
}

async function insertChunkRows(rows: ChunkInsertRow[]): Promise<void> {
  for (
    let offset = 0;
    offset < rows.length;
    offset += SOURCE_DB_INSERT_BATCH_SIZE
  ) {
    const batch = rows.slice(offset, offset + SOURCE_DB_INSERT_BATCH_SIZE);

    try {
      await db.insert(documentChunks).values(batch);
    } catch (error) {
      throw new Error(
        `Failed to save text chunks ${batch[0]?.chunkIndex ?? offset}-${(batch.at(-1)?.chunkIndex ?? offset) + 1}: ${getErrorMessage(error)}`,
      );
    }
  }
}

async function embedAndStoreBatch(
  sourceId: string,
  batch: PendingChunkBatch,
): Promise<void> {
  const values = batch.items.map((item) => item.content);

  const { embeddings } = await retryAsync(
    () =>
      embedMany({
        model: getEmbeddingModel(),
        values,
      }),
    { maxAttempts: SOURCE_EMBED_MAX_RETRIES },
  );

  if (embeddings.length !== values.length) {
    throw new Error("Mismatch between generated embeddings and text chunks.");
  }

  assertEmbeddingDimensions(embeddings);

  const rows: ChunkInsertRow[] = batch.items.map((item, index) => ({
    sourceId,
    chunkIndex: batch.startIndex + index,
    content: sanitizeSourceText(item.content),
    embedding: embeddings[index],
    metadata: { kind: "text" },
  }));

  await insertChunkRows(rows);
}

async function embedAndStoreDraftBatch(
  sourceId: string,
  drafts: IngestChunkDraft[],
  startIndex: number,
): Promise<void> {
  const values = drafts.map((draft) => draft.content);

  const { embeddings } = await retryAsync(
    () =>
      embedMany({
        model: getEmbeddingModel(),
        values,
      }),
    { maxAttempts: SOURCE_EMBED_MAX_RETRIES },
  );

  if (embeddings.length !== values.length) {
    throw new Error("Mismatch between generated embeddings and text chunks.");
  }

  assertEmbeddingDimensions(embeddings);

  const rows: ChunkInsertRow[] = drafts.map((draft, index) => ({
    sourceId,
    chunkIndex: startIndex + index,
    content: sanitizeSourceText(draft.content),
    embedding: embeddings[index],
    metadata: draft.metadata,
  }));

  await insertChunkRows(rows);
}

function getEmbeddedChunkCount(metadata: SourceMetadata | null): number {
  const count = metadata?.embeddedChunkCount;
  return typeof count === "number" && count >= 0 ? count : 0;
}

export async function createPendingSource(
  input: IngestSourceInput,
): Promise<CreatePendingSourceResult> {
  const prepared = prepareSourceText(input.extractedText);

  if (!prepared.fullText) {
    throw new Error("No text could be extracted from the source.");
  }

  const sourceType =
    (input.type as string) === "google_doc" ? "word" : input.type;

  const [newSource] = await db
    .insert(sources)
    .values({
      notebookId: input.notebookId,
      title: input.title,
      type: sourceType,
      sourceUrl: input.sourceUrl ?? null,
      storagePath: input.storagePath ?? null,
      extractedText: prepared.fullText,
      metadata: {
        ...input.metadata,
        ingestStatus: "processing" satisfies SourceIngestStatus,
        embeddedChunkCount: 0,
        totalCharacters: prepared.totalCharacters,
        isStoredInChunksOnly: prepared.isStoredInChunksOnly,
      },
      isSelected: true,
    })
    .returning();

  return { source: newSource };
}

export async function embedNextSourceBatch(
  sourceId: string,
): Promise<EmbedSourceBatchResult> {
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) {
    throw new Error("Source not found");
  }

  const metadata = (source.metadata ?? {}) as SourceMetadata;
  const currentStatus = metadata.ingestStatus ?? "ready";

  if (currentStatus === "ready") {
    return {
      done: true,
      embeddedChunkCount:
        metadata.chunkCount ?? getEmbeddedChunkCount(metadata),
      chunksCount: metadata.chunkCount ?? getEmbeddedChunkCount(metadata),
      ingestStatus: "ready",
    };
  }

  if (currentStatus === "failed") {
    return {
      done: true,
      embeddedChunkCount: getEmbeddedChunkCount(metadata),
      chunksCount: getEmbeddedChunkCount(metadata),
      ingestStatus: "failed",
    };
  }

  const embeddedChunkCount = getEmbeddedChunkCount(metadata);
  const prepared = prepareSourceText(source.extractedText ?? "");

  try {
    if (metadata.ingestChunkDraftsPath) {
      const draftCount = metadata.ingestChunkDraftCount;

      if (typeof draftCount === "number" && embeddedChunkCount >= draftCount) {
        const finalMetadata: SourceMetadata = {
          ...metadata,
          ingestStatus: "ready",
          chunkCount: embeddedChunkCount,
          totalCharacters: prepared.totalCharacters,
          isStoredInChunksOnly: prepared.isStoredInChunksOnly,
          embeddedChunkCount: undefined,
        };

        await db
          .update(sources)
          .set({
            extractedText: prepared.storedText,
            metadata: finalMetadata,
          })
          .where(eq(sources.id, sourceId));

        return {
          done: true,
          embeddedChunkCount,
          chunksCount: embeddedChunkCount,
          ingestStatus: "ready",
        };
      }

      const supabase = await createClient();
      const allDrafts = await loadIngestChunkDrafts(
        supabase,
        metadata.ingestChunkDraftsPath,
      );
      const nextDrafts = allDrafts.slice(
        embeddedChunkCount,
        embeddedChunkCount + SOURCE_EMBED_BATCH_SIZE,
      );

      if (nextDrafts.length === 0) {
        const finalMetadata: SourceMetadata = {
          ...metadata,
          ingestStatus: "ready",
          chunkCount: embeddedChunkCount,
          totalCharacters: prepared.totalCharacters,
          isStoredInChunksOnly: prepared.isStoredInChunksOnly,
          embeddedChunkCount: undefined,
        };

        await db
          .update(sources)
          .set({
            extractedText: prepared.storedText,
            metadata: finalMetadata,
          })
          .where(eq(sources.id, sourceId));

        return {
          done: true,
          embeddedChunkCount,
          chunksCount: embeddedChunkCount,
          ingestStatus: "ready",
        };
      }

      await embedAndStoreDraftBatch(sourceId, nextDrafts, embeddedChunkCount);
      const updatedEmbeddedCount = embeddedChunkCount + nextDrafts.length;
      const totalDraftCount = draftCount ?? allDrafts.length;
      const hasMore = updatedEmbeddedCount < totalDraftCount;

      if (!hasMore) {
        const finalMetadata: SourceMetadata = {
          ...metadata,
          ingestStatus: "ready",
          chunkCount: updatedEmbeddedCount,
          totalCharacters: prepared.totalCharacters,
          isStoredInChunksOnly: prepared.isStoredInChunksOnly,
          embeddedChunkCount: undefined,
        };

        await db
          .update(sources)
          .set({
            extractedText: prepared.storedText,
            metadata: finalMetadata,
          })
          .where(eq(sources.id, sourceId));

        return {
          done: true,
          embeddedChunkCount: updatedEmbeddedCount,
          chunksCount: updatedEmbeddedCount,
          ingestStatus: "ready",
        };
      }

      await db
        .update(sources)
        .set({
          metadata: {
            ...metadata,
            ingestStatus: "processing",
            embeddedChunkCount: updatedEmbeddedCount,
            totalCharacters: prepared.totalCharacters,
            isStoredInChunksOnly: prepared.isStoredInChunksOnly,
          },
        })
        .where(eq(sources.id, sourceId));

      return {
        done: false,
        embeddedChunkCount: updatedEmbeddedCount,
        chunksCount: updatedEmbeddedCount,
        ingestStatus: "processing",
      };
    }

    const fullText = source.extractedText;
    if (!fullText) {
      throw new Error("Source text is missing.");
    }

    const chunkIterator = iterateTextChunks(prepared.fullText);
    skipChunks(chunkIterator, embeddedChunkCount);

    const nextBatch = collectChunkBatch(chunkIterator, SOURCE_EMBED_BATCH_SIZE);

    if (!nextBatch) {
      const finalMetadata: SourceMetadata = {
        ...metadata,
        ingestStatus: "ready",
        chunkCount: embeddedChunkCount,
        totalCharacters: prepared.totalCharacters,
        isStoredInChunksOnly: prepared.isStoredInChunksOnly,
        embeddedChunkCount: undefined,
      };

      await db
        .update(sources)
        .set({
          extractedText: prepared.storedText,
          metadata: finalMetadata,
        })
        .where(eq(sources.id, sourceId));

      return {
        done: true,
        embeddedChunkCount,
        chunksCount: embeddedChunkCount,
        ingestStatus: "ready",
      };
    }

    await embedAndStoreBatch(sourceId, nextBatch);
    const updatedEmbeddedCount = embeddedChunkCount + nextBatch.items.length;
    const remainingBatch = collectChunkBatch(
      chunkIterator,
      SOURCE_EMBED_BATCH_SIZE,
    );

    if (!remainingBatch) {
      const finalMetadata: SourceMetadata = {
        ...metadata,
        ingestStatus: "ready",
        chunkCount: updatedEmbeddedCount,
        totalCharacters: prepared.totalCharacters,
        isStoredInChunksOnly: prepared.isStoredInChunksOnly,
        embeddedChunkCount: undefined,
      };

      await db
        .update(sources)
        .set({
          extractedText: prepared.storedText,
          metadata: finalMetadata,
        })
        .where(eq(sources.id, sourceId));

      return {
        done: true,
        embeddedChunkCount: updatedEmbeddedCount,
        chunksCount: updatedEmbeddedCount,
        ingestStatus: "ready",
      };
    }

    await db
      .update(sources)
      .set({
        metadata: {
          ...metadata,
          ingestStatus: "processing",
          embeddedChunkCount: updatedEmbeddedCount,
          totalCharacters: prepared.totalCharacters,
          isStoredInChunksOnly: prepared.isStoredInChunksOnly,
        },
      })
      .where(eq(sources.id, sourceId));

    return {
      done: false,
      embeddedChunkCount: updatedEmbeddedCount,
      chunksCount: updatedEmbeddedCount,
      ingestStatus: "processing",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Ingest failed.");

    await db
      .update(sources)
      .set({
        metadata: {
          ...metadata,
          ingestStatus: "failed",
          ingestError: message,
          embeddedChunkCount,
        },
      })
      .where(eq(sources.id, sourceId));

    throw error instanceof Error ? error : new Error(message);
  }
}
