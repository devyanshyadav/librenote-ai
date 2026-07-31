import type { NextRequest } from "next/server";
import { listNotebookSources } from "@/lib/sources/source.service";
import { apiError, apiSuccess } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ "notebook-id": string }> },
) {
  try {
    const { "notebook-id": notebookId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const notebookSources = await listNotebookSources(user.id, notebookId);

    return apiSuccess(notebookSources);
  } catch (error) {
    return apiError(error, "Failed to fetch sources");
  }
}
