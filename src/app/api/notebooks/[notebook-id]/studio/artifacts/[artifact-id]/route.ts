import type { NextRequest } from "next/server";
import {
  deleteStudioArtifact,
  renameStudioArtifact,
  updateStudioNote,
} from "@/lib/studio/studio.service";
import {
  studioArtifactRenameRequestSchema,
  studioNoteInputSchema,
} from "@/types";
import { apiError, apiSuccess } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ "notebook-id": string; "artifact-id": string }> },
) {
  try {
    const { "notebook-id": notebookId, "artifact-id": artifactId } =
      await params;
    const user = await getAuthenticatedUserOrThrow();
    const json = await request.json();

    if (typeof json === "object" && json !== null && "body" in json) {
      const noteUpdate = studioNoteInputSchema.safeParse(json);
      if (!noteUpdate.success) {
        throw new Error(
          noteUpdate.error.issues[0]?.message ?? "Invalid note update body.",
        );
      }

      const artifact = await updateStudioNote(
        user.id,
        notebookId,
        artifactId,
        noteUpdate.data,
      );
      return apiSuccess(artifact);
    }

    const renameBody = studioArtifactRenameRequestSchema.safeParse(json);
    if (!renameBody.success) {
      throw new Error(
        renameBody.error.issues[0]?.message ?? "Invalid request body.",
      );
    }

    const artifact = await renameStudioArtifact(
      user.id,
      notebookId,
      artifactId,
      renameBody.data.title,
    );

    return apiSuccess(artifact);
  } catch (error) {
    return apiError(error, "Failed to update studio artifact");
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ "notebook-id": string; "artifact-id": string }> },
) {
  try {
    const { "notebook-id": notebookId, "artifact-id": artifactId } =
      await params;
    const user = await getAuthenticatedUserOrThrow();
    await deleteStudioArtifact(user.id, notebookId, artifactId);

    return apiSuccess({ id: artifactId });
  } catch (error) {
    return apiError(error, "Failed to delete studio artifact");
  }
}
