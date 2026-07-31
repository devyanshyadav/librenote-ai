import type { NextRequest } from "next/server";
import { createNoteArtifact } from "@/lib/studio/studio.service";
import { studioNoteInputSchema } from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ "notebook-id": string }> },
) {
  try {
    const { "notebook-id": notebookId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    const body = await parseJsonBody(studioNoteInputSchema, request);
    const artifact = await createNoteArtifact(user.id, notebookId, body);

    return apiSuccess(artifact);
  } catch (error) {
    return apiError(error, "Failed to create note");
  }
}
