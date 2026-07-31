import type { NextRequest } from "next/server";
import { importBulkLinkSources } from "@/lib/sources/source.service";
import { importBulkLinksSourceSchema } from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const { notebookId, urls } = await parseJsonBody(
      importBulkLinksSourceSchema,
      request,
    );
    const result = await importBulkLinkSources(user.id, notebookId, urls);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, "Failed to import links");
  }
}
