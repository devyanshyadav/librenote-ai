import type { User } from "@supabase/supabase-js";
import { commitSourceIngest } from "@/lib/sources/source-ingest/commit";
import { resolveDocumentIngestProfile } from "@/lib/sources/source-ingest/document-profiles";
import { resolveSourceTitle } from "@/lib/sources/source-ingest/types";
import { uploadSourceBuffer } from "@/lib/sources/source-ingest/upload-source-buffer";
import { toUserFacingError } from "@/lib/app-error";
import type { CreatePendingSourceResult } from "@/utils/sources/ingest-source";
import { getFileExtension } from "@/utils/sources/source-file";

export async function ingestDocumentFile(input: {
  user: User;
  notebookId: string;
  file: File;
  title?: string;
}): Promise<CreatePendingSourceResult> {
  const fileExt = getFileExtension(input.file.name);
  const profile = resolveDocumentIngestProfile(input.file.name);
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  let extracted;

  try {
    extracted = await profile.extract(fileBuffer, fileExt);
  } catch (error) {
    throw toUserFacingError(
      error,
      "Could not read this file. It may be corrupted or unsupported.",
    );
  }

  const { storagePath, publicUrl } = await uploadSourceBuffer({
    userId: input.user.id,
    fileBuffer,
    fileName: input.file.name,
    mimeType: input.file.type,
  });

  return commitSourceIngest(input.user.id, {
    notebookId: input.notebookId,
    title: resolveSourceTitle(input.title, extracted.title ?? input.file.name),
    type: profile.sourceType,
    extractedText: extracted.fullText,
    sourceUrl: publicUrl,
    storagePath,
    structuredUnits: profile.structured ? extracted.units : undefined,
  });
}
