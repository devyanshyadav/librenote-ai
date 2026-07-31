import type { StudioArtifactItem } from "@/types";

export function getArtifactPagePath(artifactId: string, print = false) {
  const path = `/notebook/artifact/${artifactId}`;
  return print ? `${path}?print=1` : path;
}

export function getArtifactShareUrl(artifactId: string) {
  if (typeof window === "undefined") {
    return getArtifactPagePath(artifactId);
  }

  return `${window.location.origin}${getArtifactPagePath(artifactId)}`;
}

export async function copyArtifactShareUrl(artifactId: string) {
  const url = getArtifactShareUrl(artifactId);
  await navigator.clipboard.writeText(url);
  return url;
}

const SOURCE_AWARE_ARTIFACT_TYPES = new Set<StudioArtifactItem["type"]>([
  "flashcards",
  "quiz",
  "mind_map",
]);

export function artifactUsesSources(
  type: StudioArtifactItem["type"] | undefined,
) {
  return type ? SOURCE_AWARE_ARTIFACT_TYPES.has(type) : false;
}
