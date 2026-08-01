import type { StudioArtifactListItem } from "@/types";

const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

export function isStudioArtifactGenerationTimedOut(
  createdAt: string,
  now = Date.now(),
): boolean {
  const startedAt = Date.parse(createdAt);
  return (
    !Number.isNaN(startedAt) &&
    now - startedAt >= GENERATION_TIMEOUT_MS
  );
}

export function getStudioArtifactStatus(
  artifact: Pick<StudioArtifactListItem, "status" | "createdAt">,
): StudioArtifactListItem["status"] {
  if (artifact.status !== "processing") {
    return artifact.status;
  }

  return isStudioArtifactGenerationTimedOut(artifact.createdAt)
    ? "timeout"
    : "processing";
}
