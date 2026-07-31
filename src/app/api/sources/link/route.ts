import type { NextRequest } from "next/server";
import { importLinkSource } from "@/lib/sources/source.service";
import { importLinkSourceSchema } from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const { notebookId, url, title } = await parseJsonBody(
      importLinkSourceSchema,
      request,
    );
    const result = await importLinkSource(user.id, notebookId, url, title);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, "Failed to import link");
  }
}
