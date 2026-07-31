"use client";

import { ChevronDown, ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { FetchLoader } from "@/components/ui/fetch-loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getChunkDisplayContent } from "@/lib/chunks/display";
import { cn } from "@/lib/utils";
import { useCitationStore } from "@/stores/citation.store";
import {
  useGenerateSourceSummary,
  useSourceDetail,
} from "@/tanstack/queries/source.query";
import type { SourceChunk, SourceDetail } from "@/types";
import { Icon } from "@iconify/react";

function SourceChunkContent({
  chunk,
  chunks,
  index,
}: {
  chunk: SourceChunk;
  chunks: SourceChunk[];
  index: number;
}) {
  const isFigure = chunk.metadata?.kind === "figure";
  const displayContent = getChunkDisplayContent(chunks, index);

  if (!isFigure) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {displayContent}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <ImageIcon className="size-3.5" />
        <span>
          Figure
          {chunk.metadata?.page ? ` · Page ${chunk.metadata.page}` : ""}
        </span>
      </div>
      {chunk.metadata?.imageUrl ? (
        <div className="overflow-hidden rounded-lg border bg-background">
          <img
            alt={
              chunk.metadata.page
                ? `Figure on page ${chunk.metadata.page}`
                : "Document figure"
            }
            className="h-auto w-full object-contain"
            src={chunk.metadata.imageUrl}
          />
        </div>
      ) : null}
    </div>
  );
}

function SourceGuide({ source }: { source: SourceDetail }) {
  const { mutate, isPending } = useGenerateSourceSummary();
  const startedRef = useRef(false);

  useEffect(() => {
    if (
      source.summary ||
      source.ingestStatus !== "ready" ||
      source.summaryStatus === "processing"
    ) {
      return;
    }

    if (isPending || startedRef.current) {
      return;
    }

    startedRef.current = true;
    mutate(source.id);
  }, [source, isPending, mutate]);

  const isGenerating =
    source.summaryStatus === "processing" || (isPending && !source.summary);
  const hasFailed = source.summaryStatus === "failed";

  return (
    <Collapsible defaultOpen className="px-1 pt-2">
      <div className="rounded-xl border border-primary/20 ring-3 ring-accent/50 bg-muted">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
          <Icon
            icon={"si:ai-duotone"}
            className="size-5 shrink-0 text-primary"
          />
          <span className="flex-1 font-medium text-sm">Source guide</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform in-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          <div className="max-h-48 overflow-y-auto scroll-fade pr-1.5 scrollbar-thin">
            {isGenerating ? (
              <FetchLoader
                size="xs"
                text="Generating summary..."
                className="py-1 text-muted-foreground"
              />
            ) : source.summary ? (
              <MessageResponse className="border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground/90">
                {source.summary}
              </MessageResponse>
            ) : hasFailed ? (
              <p className="text-destructive text-sm">
                Could not generate summary. Try reopening this source.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Summary unavailable for this source.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function SourceViewer() {
  const { isOpen, activeSourceId, activeChunkId } = useCitationStore();
  const chunkRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data: source, isLoading } = useSourceDetail(
    activeSourceId || "",
    isOpen && !!activeSourceId,
  );

  const chunks = source?.chunks ?? [];

  useEffect(() => {
    if (!activeChunkId || !isOpen || chunks.length === 0) {
      return;
    }

    const element = chunkRefs.current.get(activeChunkId);
    if (!element) {
      return;
    }

    const timeout = setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => clearTimeout(timeout);
  }, [activeChunkId, isOpen, chunks]);

  if (!activeSourceId) {
    return (
      <SidebarGroup className="flex-1">
        <SidebarGroupContent className="flex items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No source selected</p>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup className="flex-1">
        <SidebarGroupContent className="flex flex-col items-center justify-center gap-2 py-16">
          <FetchLoader
            size="lg"
            text="Loading source..."
            className="text-primary"
          />
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="min-h-0 flex-1">
      {source ? <SourceGuide key={activeSourceId} source={source} /> : null}
      <SidebarGroupContent className="min-h-0 mt-2 overflow-y-auto scroll-fade">
        {source?.ingestStatus === "processing" && chunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-3 py-16">
            <FetchLoader
              size="lg"
              text="Indexing source content..."
              className="text-primary"
            />
          </div>
        ) : chunks.length === 0 ? (
          <p className="px-3 py-8 text-center text-muted-foreground text-sm">
            No content indexed yet.
          </p>
        ) : (
          <SidebarMenu>
            {chunks.map((chunk: SourceChunk, index: number) => {
              const isHighlighted = activeChunkId && chunk.id === activeChunkId;

              return (
                <SidebarMenuItem key={chunk.id}>
                  <SidebarMenuButton
                    asChild
                    className="h-auto min-h-9 items-start whitespace-normal"
                  >
                    <div
                      ref={(element) => {
                        if (element) {
                          chunkRefs.current.set(chunk.id, element);
                        } else {
                          chunkRefs.current.delete(chunk.id);
                        }
                      }}
                      className={cn(
                        "w-full min-w-0 rounded-md p-2 transition-all duration-300",
                        chunk.metadata?.kind === "figure" &&
                          "border border-dashed bg-muted/20",
                        isHighlighted
                          ? "border-l-4 border-primary bg-primary/10 shadow-sm"
                          : "hover:bg-muted/10",
                      )}
                    >
                      <SourceChunkContent
                        chunk={chunk}
                        chunks={chunks}
                        index={index}
                      />
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
