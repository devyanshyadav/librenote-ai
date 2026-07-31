import { z } from "zod";
import { SOURCE_MAX_BULK_URLS } from "@/lib/constants";

export const webSourceMetadataSchema = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  siteName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  hostname: z.string(),
});

export type WebSourceMetadata = z.infer<typeof webSourceMetadataSchema>;

export const youtubeSourceMetadataSchema = z.object({
  videoId: z.string(),
  url: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  channelName: z.string().nullable(),
  channelId: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  languageCode: z.string().nullable(),
  isGenerated: z.boolean().nullable(),
});

export type YouTubeSourceMetadata = z.infer<typeof youtubeSourceMetadataSchema>;

export const sourceIngestStatusSchema = z.enum([
  "processing",
  "ready",
  "failed",
]);

export type SourceIngestStatus = z.infer<typeof sourceIngestStatusSchema>;

export const sourceSummaryStatusSchema = z.enum([
  "none",
  "processing",
  "ready",
  "failed",
]);

export type SourceSummaryStatus = z.infer<typeof sourceSummaryStatusSchema>;

export const sourceSectionNotesSchema = z.object({
  mainTopics: z.array(z.string()),
  keyPoints: z.array(z.string()),
  conclusions: z.array(z.string()),
});

export type SourceSectionNotes = z.infer<typeof sourceSectionNotesSchema>;

export const sourceMetadataSchema = webSourceMetadataSchema
  .partial()
  .merge(youtubeSourceMetadataSchema.partial())
  .extend({
    ingestStatus: sourceIngestStatusSchema.optional(),
    embeddedChunkCount: z.number().int().nonnegative().optional(),
    chunkCount: z.number().int().nonnegative().optional(),
    totalCharacters: z.number().int().nonnegative().optional(),
    isStoredInChunksOnly: z.boolean().optional(),
    ingestError: z.string().optional(),
    summaryStatus: z.enum(["processing", "failed"]).optional(),
    /** Supabase storage path to serialized ingest chunk drafts (PDF figures) */
    ingestChunkDraftsPath: z.string().optional(),
    ingestChunkDraftCount: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;

export function getSourceIngestStatus(
  metadata: SourceMetadata | null | undefined,
): SourceIngestStatus {
  return metadata?.ingestStatus ?? "ready";
}

export function getSourceSummaryStatus(
  summary: string | null | undefined,
  metadata: SourceMetadata | null | undefined,
): SourceSummaryStatus {
  if (summary?.trim()) {
    return "ready";
  }

  if (metadata?.summaryStatus === "processing") {
    return "processing";
  }

  if (metadata?.summaryStatus === "failed") {
    return "failed";
  }

  return "none";
}

export const notebookSourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.string(),
  sourceUrl: z.string().nullable(),
  summary: z.string().nullable(),
  metadata: sourceMetadataSchema.nullable(),
  isSelected: z.boolean(),
  createdAt: z.string(),
  ingestStatus: sourceIngestStatusSchema,
  summaryStatus: sourceSummaryStatusSchema,
});

export type NotebookSource = z.infer<typeof notebookSourceSchema>;

export type SourceListMetadata = Pick<
  SourceMetadata,
  | "ingestStatus"
  | "ingestError"
  | "faviconUrl"
  | "thumbnailUrl"
  | "hostname"
  | "siteName"
  | "description"
  | "channelName"
  | "durationSeconds"
>;

export type NotebookSourceListItem = Omit<
  NotebookSource,
  "sourceUrl" | "summary" | "summaryStatus" | "metadata"
> & {
  metadata: SourceListMetadata | null;
};

export type NotebookSourceRef = Pick<NotebookSource, "id" | "title">;
export type NotebookSourceIngestRef = Pick<
  NotebookSource,
  "id" | "ingestStatus"
>;

export const sourceChunkMetadataSchema = z.object({
  kind: z.enum(["text", "figure"]),
  page: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
});

export type SourceChunkMetadata = z.infer<typeof sourceChunkMetadataSchema>;

export const sourceChunkSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  metadata: sourceChunkMetadataSchema.nullable().optional(),
});

export type SourceChunk = z.infer<typeof sourceChunkSchema>;

export const sourceDetailSchema = notebookSourceSchema.extend({
  chunks: z.array(sourceChunkSchema),
});

export type SourceDetail = z.infer<typeof sourceDetailSchema>;

export const updateSourceSelectionSchema = z.object({
  isSelected: z.boolean(),
});

export const bulkSourceSelectionSchema = z.object({
  isSelected: z.boolean(),
});

export type UpdateSourceSelectionPayload = z.infer<
  typeof updateSourceSelectionSchema
>;

export type BulkSourceSelectionPayload = z.infer<
  typeof bulkSourceSelectionSchema
>;

export const optionalSourceTitleSchema = z.string().min(1).optional();

export const uploadSourceRequestSchema = z.object({
  notebookId: z.string().uuid("Invalid notebook ID format"),
  title: optionalSourceTitleSchema,
});

export const importTextSourceSchema = z.object({
  notebookId: z.string().uuid(),
  text: z.string().min(1, "Text cannot be empty"),
  title: optionalSourceTitleSchema,
});

export type ImportTextSourcePayload = z.infer<typeof importTextSourceSchema>;

export const importLinkSourceSchema = z.object({
  notebookId: z.string().uuid(),
  url: z.string().min(1, "Please enter a URL"),
  title: optionalSourceTitleSchema,
});

export type ImportLinkSourcePayload = z.infer<typeof importLinkSourceSchema>;

export const importBulkLinksSourceSchema = z.object({
  notebookId: z.string().uuid(),
  urls: z
    .array(z.string().min(1))
    .min(1, "Add at least one URL")
    .max(
      SOURCE_MAX_BULK_URLS,
      `You can import up to ${SOURCE_MAX_BULK_URLS} URLs at a time`,
    ),
});

export type ImportBulkLinksSourcePayload = z.infer<
  typeof importBulkLinksSourceSchema
>;

export interface BulkLinkImportResultItem {
  url: string;
  source: NotebookSource;
}

export interface CreateSourceResult {
  source: NotebookSource;
}

export interface EmbedSourceBatchResult {
  done: boolean;
  embeddedChunkCount: number;
  chunksCount: number;
  ingestStatus: SourceIngestStatus;
}

export interface BulkLinkImportFailure {
  url: string;
  error: string;
}

export interface BulkLinkImportResult {
  succeeded: BulkLinkImportResultItem[];
  failed: BulkLinkImportFailure[];
}
