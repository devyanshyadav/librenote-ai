import type { SupabaseClient } from "@supabase/supabase-js";
import type { SourceChunkMetadata } from "@/types";
import { iterateTextChunks } from "@/utils/text-splitter";

export interface DocumentIngestUnit {
  kind: "text" | "figure";
  page: number;
  content: string;
  imageBuffer?: Buffer;
  imageContentType?: string;
  imageUrl?: string;
}

export interface IngestChunkDraft {
  content: string;
  metadata: SourceChunkMetadata | null;
}

export function buildChunkDraftsFromUnits(
  units: DocumentIngestUnit[],
): IngestChunkDraft[] {
  const drafts: IngestChunkDraft[] = [];
  let textBuffer = "";

  const flushText = () => {
    const normalized = textBuffer.trim();
    textBuffer = "";

    if (!normalized) {
      return;
    }

    for (const slice of iterateTextChunks(normalized)) {
      drafts.push({
        content: slice.content,
        metadata: { kind: "text" },
      });
    }
  };

  for (const unit of units) {
    if (unit.kind === "text") {
      textBuffer = textBuffer
        ? `${textBuffer}\n\n${unit.content}`
        : unit.content;
      continue;
    }

    flushText();
    drafts.push({
      content: unit.content.trim() || `Figure on page ${unit.page}`,
      metadata: {
        kind: "figure",
        page: unit.page,
        imageUrl: unit.imageUrl,
      },
    });
  }

  flushText();
  return drafts;
}

export function getIngestChunkDraftsPath(
  userId: string,
  sourceId: string,
): string {
  return `${userId}/ingest/${sourceId}/chunk-drafts.json`;
}

export async function saveIngestChunkDrafts(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
  drafts: IngestChunkDraft[],
): Promise<string> {
  const path = getIngestChunkDraftsPath(userId, sourceId);
  const body = JSON.stringify(drafts);

  const { error } = await supabase.storage
    .from("sources")
    .upload(path, Buffer.from(body, "utf-8"), {
      cacheControl: "3600",
      upsert: true,
      contentType: "application/json",
    });

  if (error) {
    throw new Error(`Failed to save ingest chunk drafts: ${error.message}`);
  }

  return path;
}

export async function loadIngestChunkDrafts(
  supabase: SupabaseClient,
  path: string,
): Promise<IngestChunkDraft[]> {
  const { data, error } = await supabase.storage.from("sources").download(path);

  if (error || !data) {
    throw new Error(`Failed to load ingest chunk drafts: ${error?.message}`);
  }

  const parsed: unknown = JSON.parse(await data.text());

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid ingest chunk drafts payload.");
  }

  return parsed as IngestChunkDraft[];
}
