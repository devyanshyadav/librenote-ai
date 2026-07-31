import type { User } from "@supabase/supabase-js";
import { commitSourceIngest } from "@/lib/sources/source-ingest/commit";
import { resolveSourceTitle } from "@/lib/sources/source-ingest/types";
import { uploadSourceBuffer } from "@/lib/sources/source-ingest/upload-source-buffer";
import { AppError } from "@/lib/app-error";
import type { CreatePendingSourceResult } from "@/utils/sources/ingest-source";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";
import { transcribeAudioFile } from "@/utils/sources/transcribe-audio";

export async function ingestAudioFile(input: {
  user: User;
  notebookId: string;
  file: File;
  title?: string;
}): Promise<CreatePendingSourceResult> {
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  const transcribedText = sanitizeSourceText(
    await transcribeAudioFile(
      new File([Uint8Array.from(fileBuffer)], input.file.name, {
        type: input.file.type,
      }),
    ),
  );

  if (!transcribedText) {
    throw new AppError("No speech could be transcribed from this audio file.");
  }

  const { storagePath, publicUrl } = await uploadSourceBuffer({
    userId: input.user.id,
    fileBuffer,
    fileName: input.file.name,
    mimeType: input.file.type,
  });

  return commitSourceIngest(input.user.id, {
    notebookId: input.notebookId,
    title: resolveSourceTitle(input.title, input.file.name),
    type: "audio",
    extractedText: transcribedText,
    sourceUrl: publicUrl,
    storagePath,
  });
}
