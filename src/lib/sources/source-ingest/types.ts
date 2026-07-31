import type { Source } from "@/db/schema";
import type { DocumentIngestUnit } from "@/lib/chunks/ingest-drafts";
import type { SourceMetadata } from "@/types";

export type DocumentSourceType = Extract<
  Source["type"],
  "pdf" | "word" | "spreadsheet" | "text_note"
>;

export interface DocumentExtractResult {
  fullText: string;
  units: DocumentIngestUnit[];
  title?: string;
}

export interface DocumentIngestProfile {
  id: string;
  extensions: readonly string[];
  sourceType: DocumentSourceType;
  structured: boolean;
  extract: (
    buffer: Buffer,
    extension: string,
  ) => Promise<DocumentExtractResult>;
}

export interface SourceIngestCommitInput {
  notebookId: string;
  title: string;
  type: Source["type"];
  extractedText: string;
  sourceUrl?: string | null;
  storagePath?: string | null;
  metadata?: SourceMetadata;
  structuredUnits?: DocumentIngestUnit[];
}

export function resolveSourceTitle(
  explicitTitle: string | undefined,
  fallback: string,
): string {
  const trimmed = explicitTitle?.trim();
  return trimmed || fallback;
}

export function getDefaultTextNoteTitle(): string {
  return `Pasted note · ${new Date().toISOString().slice(0, 10)}`;
}
