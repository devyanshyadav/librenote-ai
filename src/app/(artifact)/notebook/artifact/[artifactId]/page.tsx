import { ArtifactStandalonePage } from "@/components/studio/artifact-standalone-page";

export default async function Page({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}) {
  const { artifactId } = await params;

  return <ArtifactStandalonePage artifactId={artifactId} />;
}
