import { createClient } from "@/lib/supabase/server";
import {
  getFileExtension,
  resolveDocumentUploadContentType,
} from "@/utils/sources/source-file";

export async function uploadSourceBuffer(input: {
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const fileExt = getFileExtension(input.fileName);
  const randomId = Math.random().toString(36).substring(2, 9);
  const storagePath = `${input.userId}/${Date.now()}-${randomId}.${fileExt}`;
  const supabase = await createClient();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("sources")
    .upload(storagePath, input.fileBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: resolveDocumentUploadContentType(
        input.fileName,
        input.mimeType,
      ),
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("sources").getPublicUrl(uploadData.path);

  return { storagePath, publicUrl };
}
