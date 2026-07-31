import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sources } from "@/db/schema";
import {
  buildChunkDraftsFromUnits,
  saveIngestChunkDrafts,
} from "@/lib/chunks/ingest-drafts";
import type { SourceIngestCommitInput } from "@/lib/sources/source-ingest/types";
import { createClient } from "@/lib/supabase/server";
import type { SourceMetadata } from "@/types";
import {
  createPendingSource,
  type CreatePendingSourceResult,
} from "@/utils/sources/ingest-source";
import { uploadIngestFigureImages } from "@/utils/documents/pdf-document";

export async function commitSourceIngest(
  userId: string,
  input: SourceIngestCommitInput,
): Promise<CreatePendingSourceResult> {
  const result = await createPendingSource({
    notebookId: input.notebookId,
    title: input.title,
    type: input.type,
    extractedText: input.extractedText,
    sourceUrl: input.sourceUrl ?? null,
    storagePath: input.storagePath ?? null,
    metadata: input.metadata,
  });

  if (!input.structuredUnits?.length) {
    return result;
  }

  const supabase = await createClient();
  const unitsWithUrls = await uploadIngestFigureImages(
    supabase,
    userId,
    result.source.id,
    input.structuredUnits,
  );
  const drafts = buildChunkDraftsFromUnits(unitsWithUrls);
  const ingestChunkDraftsPath = await saveIngestChunkDrafts(
    supabase,
    userId,
    result.source.id,
    drafts,
  );
  const baseMetadata = (result.source.metadata ?? {}) as SourceMetadata;

  await db
    .update(sources)
    .set({
      metadata: {
        ...baseMetadata,
        ingestChunkDraftsPath,
        ingestChunkDraftCount: drafts.length,
      },
    })
    .where(eq(sources.id, result.source.id));

  return result;
}
