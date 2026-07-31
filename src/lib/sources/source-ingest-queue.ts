import type { QueryClient } from "@tanstack/react-query";
import { sourceClient } from "@/tanstack/clients";
import { sourceQueryKeys } from "@/tanstack/queries/source.query-keys";
import type { NotebookSourceIngestRef } from "@/types";

interface QueueItem {
  notebookId: string;
  sourceId: string;
}

class SourceIngestQueue {
  private queue: QueueItem[] = [];
  private activeSourceIds = new Set<string>();
  private isRunning = false;

  enqueue(notebookId: string, sourceIds: string[], queryClient: QueryClient) {
    for (const sourceId of sourceIds) {
      if (this.activeSourceIds.has(sourceId)) {
        continue;
      }

      this.activeSourceIds.add(sourceId);
      this.queue.push({ notebookId, sourceId });
    }

    void this.process(queryClient);
  }

  private async process(queryClient: QueryClient) {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        continue;
      }

      try {
        let done = false;

        while (!done) {
          const response = await sourceClient.embedSourceBatch(item.sourceId);
          done = response.data?.done ?? true;
        }
      } catch (error) {
        console.error(
          `[source-ingest] Failed to embed source ${item.sourceId}:`,
          error,
        );
      } finally {
        this.activeSourceIds.delete(item.sourceId);
        await queryClient.invalidateQueries({
          queryKey: sourceQueryKeys.notebookSources(item.notebookId),
        });
      }
    }

    this.isRunning = false;
  }
}

const sourceIngestQueue = new SourceIngestQueue();

export function enqueueSourceIngest(
  notebookId: string,
  sourceIds: string | string[],
  queryClient: QueryClient,
) {
  const ids = Array.isArray(sourceIds) ? sourceIds : [sourceIds];
  if (ids.length === 0) {
    return;
  }

  sourceIngestQueue.enqueue(notebookId, ids, queryClient);
}

export function handleCreatedSources(
  notebookId: string,
  createdSources: NotebookSourceIngestRef[],
  queryClient: QueryClient,
) {
  queryClient.invalidateQueries({
    queryKey: sourceQueryKeys.notebookSources(notebookId),
  });

  const processingIds = createdSources
    .filter((source) => source.ingestStatus === "processing")
    .map((source) => source.id);

  enqueueSourceIngest(notebookId, processingIds, queryClient);
}
