"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ArtifactStandaloneShell } from "@/components/studio/artifact-standalone-shell";
import { StudioArtifactViewer } from "@/components/studio/studio-artifact-viewer";
import { ReportPrintView } from "@/components/studio/viewers/report-print-view";
import { artifactUsesSources } from "@/lib/studio/artifact-share";
import { getStudioArtifactStatus } from "@/lib/studio/studio-artifact-status";
import { useNotebookSources } from "@/tanstack/queries/source.query";
import { useStudioArtifact } from "@/tanstack/queries/studio.query";

function ArtifactStatus({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#111522] px-6">
      <p className="max-w-md text-center text-sm text-white/60">{message}</p>
    </div>
  );
}

function ArtifactStandalonePageContent({ artifactId }: { artifactId: string }) {
  const printMode = useSearchParams().get("print") === "1";
  const { data: artifact, isLoading, isError } = useStudioArtifact(artifactId);
  const { data: sources = [] } = useNotebookSources(
    artifact?.notebookId ?? "",
    artifactUsesSources(artifact?.type),
  );

  useEffect(() => {
    if (!artifact) {
      return;
    }

    document.title = artifact.title;

    if (
      !printMode ||
      artifact.type !== "report" ||
      !artifact.content ||
      artifact.status !== "completed"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timeout);
  }, [artifact, printMode]);

  if (isLoading) {
    return <ArtifactStatus message="Loading artifact…" />;
  }

  if (isError || !artifact) {
    return (
      <ArtifactStatus message="Artifact not found or you do not have access." />
    );
  }

  const status = artifact ? getStudioArtifactStatus(artifact) : null;

  if (status === "processing") {
    return <ArtifactStatus message="This artifact is still generating…" />;
  }

  if (status === "timeout") {
    return (
      <ArtifactStatus message="This artifact timed out while generating." />
    );
  }

  if (printMode) {
    if (artifact.type !== "report" || !artifact.content) {
      return (
        <ArtifactStatus message="Print view is only available for completed reports." />
      );
    }

    return (
      <ReportPrintView content={artifact.content} title={artifact.title} />
    );
  }

  return (
    <ArtifactStandaloneShell artifact={artifact}>
      <StudioArtifactViewer
        artifact={artifact}
        sources={sources}
        notebookId={artifact.notebookId}
        mode="standalone"
      />
    </ArtifactStandaloneShell>
  );
}

export function ArtifactStandalonePage({ artifactId }: { artifactId: string }) {
  return (
    <Suspense fallback={<ArtifactStatus message="Loading artifact…" />}>
      <ArtifactStandalonePageContent artifactId={artifactId} />
    </Suspense>
  );
}
