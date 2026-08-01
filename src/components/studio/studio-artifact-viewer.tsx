"use client";

import type {
  NotebookSourceRef,
  StudioArtifactItem,
  StudioArtifactViewMode,
} from "@/types";
import { getStudioArtifactStatus } from "@/lib/studio/studio-artifact-status";
import { AudioOverviewViewer } from "./viewers/audio-overview-viewer";
import { DataTableViewer } from "./viewers/data-table-viewer";
import { FlashcardsViewer } from "./viewers/flashcards-viewer";
import { MindMapViewer } from "./viewers/mind-map-viewer";
import { NoteViewer } from "./viewers/note-viewer";
import { QuizViewer } from "./viewers/quiz-viewer";
import { ReportViewer } from "./viewers/report-viewer";
import { Icon } from "@iconify/react";

export function StudioArtifactViewer({
  artifact,
  sources = [],
  notebookId,
  mode = "studio",
}: {
  artifact: StudioArtifactItem;
  sources?: NotebookSourceRef[];
  notebookId?: string;
  mode?: StudioArtifactViewMode;
}) {
  const status = getStudioArtifactStatus(artifact);

  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Icon
          icon="svg-spinners:ring-resize"
          className="size-6 text-muted-foreground mb-4"
        />
        <p className="text-muted-foreground text-sm">Generating artifact...</p>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Icon
          icon="material-symbols:timer-off-outline-rounded"
          className="size-6 text-destructive mb-4"
        />
        <p className="text-destructive text-sm">
          Generation timed out. Delete and try again.
        </p>
      </div>
    );
  }

  if (status === "failed" || !artifact.content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Icon
          icon="material-symbols:error-outline-rounded"
          className="size-6 text-destructive mb-4"
        />
        <p className="text-destructive text-sm">
          Failed to generate. Delete and try again.
        </p>
      </div>
    );
  }

  switch (artifact.type) {
    case "flashcards":
      return (
        <FlashcardsViewer
          artifactId={artifact.id}
          content={artifact.content}
          sources={sources}
          mode={mode}
        />
      );
    case "quiz":
      return (
        <QuizViewer content={artifact.content} sources={sources} mode={mode} />
      );
    case "report":
      return (
        <ReportViewer
          artifactId={artifact.id}
          content={artifact.content}
          title={artifact.title}
          mode={mode}
        />
      );
    case "data_table":
      return (
        <DataTableViewer
          content={artifact.content}
          sources={sources}
          mode={mode}
        />
      );
    case "mind_map":
      return (
        <MindMapViewer
          content={artifact.content}
          sources={sources}
          mode={mode}
        />
      );
    case "audio_overview":
      return (
        <AudioOverviewViewer
          content={artifact.content}
          fileUrl={artifact.fileUrl}
        />
      );
    case "note":
      if (!notebookId) {
        return (
          <p className="text-muted-foreground text-sm">
            Note editor is unavailable.
          </p>
        );
      }

      return (
        <NoteViewer
          artifactId={artifact.id}
          notebookId={notebookId}
          content={artifact.content}
          mode={mode}
        />
      );
    default:
      return (
        <p className="text-muted-foreground text-sm">
          Unsupported artifact type.
        </p>
      );
  }
}
