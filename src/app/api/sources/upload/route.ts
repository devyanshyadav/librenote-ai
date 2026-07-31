import { AppError } from "@/lib/app-error";
import type { NextRequest } from "next/server";
import { uploadSourceFile } from "@/lib/sources/source.service";
import { uploadSourceRequestSchema } from "@/types";
import { apiError, apiSuccess } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const formData = await request.formData();
    const file = formData.get("file");
    const notebookId = formData.get("notebookId");
    const title = formData.get("title");

    if (!(file instanceof File)) {
      throw new AppError("Validation failed: No file provided");
    }

    const parsedFields = uploadSourceRequestSchema.safeParse({
      notebookId,
      title: typeof title === "string" && title.trim() ? title : undefined,
    });
    if (!parsedFields.success) {
      throw new AppError(`Validation failed: ${parsedFields.error.message}`);
    }

    const result = await uploadSourceFile(
      user,
      parsedFields.data.notebookId,
      file,
      parsedFields.data.title,
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, "Failed to upload source");
  }
}
