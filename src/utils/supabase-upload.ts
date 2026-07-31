import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a file to the Supabase Storage 'gallery' bucket in a user-specific folder.
 * Returns the public URL of the uploaded asset.
 */
export async function uploadToGallery(file: File): Promise<string> {
  const supabase = createClient();

  // 1. Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized: Please log in to upload files.");
  }

  // 2. Generate a unique path inside the user's folder
  const fileExt = file.name.split(".").pop() || "png";
  const randomId = Math.random().toString(36).substring(2, 9);
  const filePath = `${user.id}/${Date.now()}-${randomId}.${fileExt}`;

  // 3. Upload to the 'gallery' bucket
  const { data, error: uploadError } = await supabase.storage
    .from("gallery")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error(" Storage upload error:", uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // 4. Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("gallery").getPublicUrl(data.path);

  return publicUrl;
}
