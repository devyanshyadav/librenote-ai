import type { User } from "@supabase/supabase-js";
import { ingestAudioFile } from "@/lib/sources/source-ingest/ingest-audio-file";
import { ingestDocumentFile } from "@/lib/sources/source-ingest/ingest-document-file";
import { AppError, toUserFacingError } from "@/lib/app-error";
import type { CreatePendingSourceResult } from "@/utils/sources/ingest-source";
import {
  getUnsupportedAudioMessage,
  getUnsupportedDocumentMessage,
  isAudioSourceFile,
  isDocumentSourceFile,
  isSupportedAudioUpload,
  isSupportedDocumentUpload,
} from "@/utils/sources/source-file";

export async function ingestUploadedFile(input: {
  user: User;
  notebookId: string;
  file: File;
  title?: string;
}): Promise<CreatePendingSourceResult> {
  try {
    if (isDocumentSourceFile(input.file)) {
      if (!isSupportedDocumentUpload(input.file)) {
        throw new AppError(getUnsupportedDocumentMessage(input.file));
      }

      return await ingestDocumentFile(input);
    }

    if (isAudioSourceFile(input.file)) {
      if (!isSupportedAudioUpload(input.file)) {
        throw new AppError(getUnsupportedAudioMessage(input.file));
      }

      return await ingestAudioFile(input);
    }

    throw new AppError(getUnsupportedDocumentMessage(input.file));
  } catch (error) {
    throw toUserFacingError(
      error,
      "Failed to upload this file. Please try again.",
    );
  }
}
