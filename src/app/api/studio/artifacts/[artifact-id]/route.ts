import type { NextRequest } from "next/server";
import { getStudioArtifactById } from "@/lib/studio/studio.service";
import { apiError, apiSuccess } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ "artifact-id": string }> },
) {
  try {
    const { "artifact-id": artifactId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const artifact = await getStudioArtifactById(user.id, artifactId);

    return apiSuccess(artifact);
  } catch (error) {
    return apiError(error, "Failed to fetch studio artifact");
  }
}
