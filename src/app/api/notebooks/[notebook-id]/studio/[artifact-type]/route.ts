import { after } from "next/server";
import type { NextRequest } from "next/server";
import { getSelectedNotebookSourceIds } from "@/lib/sources/source.service";
import {
  createStudioArtifactJob,
  runStudioArtifactGeneration,
} from "@/lib/studio/studio.service";
import { StudioJourneyLog } from "@/lib/studio/studio-journey-log";
import {
  STUDIO_ARTIFACT_SLUG_TO_TYPE,
  type StudioGeneratedArtifactType,
  studioArtifactSlugSchema,
  studioGenerateArtifactRequestSchema,
} from "@/types";
import { apiError, apiSuccess, parseJsonBody } from "@/utils/api-route";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ "notebook-id": string; "artifact-type": string }> },
) {
  const { "notebook-id": notebookId, "artifact-type": artifactType } =
    await params;
  const log = StudioJourneyLog.create({ notebookId, artifactType });

  try {
    const slugResult = studioArtifactSlugSchema.safeParse(artifactType);
    if (!slugResult.success) {
      throw new Error(`Unsupported artifact type: ${artifactType}`);
    }

    const slug = slugResult.data;
    if (slug === "note") {
      throw new Error("Use POST /studio/note to create notes.");
    }

    const type = STUDIO_ARTIFACT_SLUG_TO_TYPE[
      slug
    ] as StudioGeneratedArtifactType;
    const user = await getAuthenticatedUserOrThrow();
    const body = await parseJsonBody(
      studioGenerateArtifactRequestSchema,
      request,
    );
    const sourceIds = await getSelectedNotebookSourceIds(
      notebookId,
      body.sourceIds,
    );

    const artifact = await createStudioArtifactJob(user.id, notebookId, type);

    log.success("api", "Artifact job created", {
      artifactId: artifact.id,
      sourceIds,
    });

    after(async () => {
      try {
        await runStudioArtifactGeneration(
          user.id,
          notebookId,
          artifact.id,
          log.id,
          sourceIds,
          body.options,
        );
      } catch (error) {
        log.fail("api", "Background generation failed", error);
      }
    });

    return apiSuccess(artifact);
  } catch (error) {
    log.fail("api", "Artifact API request failed", error);
    return apiError(error, "Failed to generate studio artifact");
  }
}
