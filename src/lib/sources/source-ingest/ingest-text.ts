import { commitSourceIngest } from "@/lib/sources/source-ingest/commit";
import {
  getDefaultTextNoteTitle,
  resolveSourceTitle,
} from "@/lib/sources/source-ingest/types";
import { AppError } from "@/lib/app-error";
import type { CreatePendingSourceResult } from "@/utils/sources/ingest-source";

export async function ingestTextSource(input: {
  userId: string;
  notebookId: string;
  text: string;
  title?: string;
}): Promise<CreatePendingSourceResult> {
  const trimmed = input.text.trim();

  if (!trimmed) {
    throw new AppError("Pasted text cannot be empty.");
  }

  return commitSourceIngest(input.userId, {
    notebookId: input.notebookId,
    title: resolveSourceTitle(input.title, getDefaultTextNoteTitle()),
    type: "text_note",
    extractedText: trimmed,
    sourceUrl: null,
    storagePath: null,
  });
}
