"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { enqueueSourceIngest } from "@/lib/sources/source-ingest-queue";
import type { NotebookSourceIngestRef } from "@/types";

export function useResumeSourceIngest(
  notebookId: string,
  sources: NotebookSourceIngestRef[],
) {
  const queryClient = useQueryClient();
  const resumedSourceIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const processingIds = sources
      .filter((source) => source.ingestStatus === "processing")
      .map((source) => source.id)
      .filter((sourceId) => !resumedSourceIdsRef.current.has(sourceId));

    if (processingIds.length === 0) {
      return;
    }

    for (const sourceId of processingIds) {
      resumedSourceIdsRef.current.add(sourceId);
    }

    enqueueSourceIngest(notebookId, processingIds, queryClient);
  }, [notebookId, queryClient, sources]);
}
