"use client";

import { useMemo } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SourceTypeIcon } from "@/components/notebook/source-type-icon";
import { getSearchContextDisplaySources } from "@/lib/chat/chat-tool-activity.utils";
import { cn } from "@/lib/utils";
import { useNotebookSources } from "@/tanstack/queries/source.query";
import type { NotebookChatUIMessage, NotebookSourceListItem } from "@/types";

export function ChatSourceSearchIndicator({
  notebookId,
  message,
}: {
  notebookId: string;
  message?: NotebookChatUIMessage;
}) {
  const { data: notebookSources = [] } = useNotebookSources(notebookId);

  const readySources = useMemo(
    () =>
      notebookSources.filter(
        (source: NotebookSourceListItem) => source.isSelected && source.ingestStatus === "ready",
      ),
    [notebookSources],
  );

  const { sources, isWaitingForToolOutput } = useMemo(
    () => getSearchContextDisplaySources(message, readySources),
    [message, readySources],
  );

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      {sources.length > 0 ? (
        <div className="flex items-center">
          {sources.map((source, index) => (
            <div
              key={source.id}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-2 bg-card shadow-sm",
                isWaitingForToolOutput
                  ? " border-primary/50"
                  : "border-background",
              )}
              style={{
                marginLeft: index === 0 ? 0 : -15,
                zIndex: sources.length - index,
              }}
            >
              <SourceTypeIcon
                type={source.type}
                metadata={source.metadata}
                className="size-4"
              />
            </div>
          ))}
        </div>
      ) : null}

      <Shimmer className="text-sm font-medium tracking-wide">
        {isWaitingForToolOutput ? "Searching sources..." : "Reading sources..."}
      </Shimmer>
    </div>
  );
}
