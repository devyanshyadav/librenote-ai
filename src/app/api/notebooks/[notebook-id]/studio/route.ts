import type { NextRequest } from "next/server";
import { listStudioArtifacts } from "@/lib/studio/studio.service";
import { apiError, apiSuccess } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ "notebook-id": string }> },
) {
  try {
    const { "notebook-id": notebookId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const artifacts = await listStudioArtifacts(user.id, notebookId);

    return apiSuccess(artifacts);
  } catch (error) {
    return apiError(error, "Failed to fetch studio artifacts");
  }
}
