import type { NextRequest } from "next/server";
import { importTextSource } from "@/lib/sources/source.service";
import { importTextSourceSchema } from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const { notebookId, text, title } = await parseJsonBody(
      importTextSourceSchema,
      request,
    );
    const result = await importTextSource(user.id, notebookId, text, title);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, "Failed to add text source");
  }
}
