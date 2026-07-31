"use client";

import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useResumeSourceIngest } from "@/hooks/use-resume-source-ingest";
import { FetchLoader } from "@/components/ui/fetch-loader";
import { useCitationStore } from "@/stores/citation.store";
import {
  useNotebookSources,
  useUpdateAllSourceSelection,
  useUpdateSourceSelection,
} from "@/tanstack/queries/source.query";
import type { NotebookSourceListItem } from "@/types";
import { SidebarAddSourceInput } from "./sidebar-add-source-input";
import { SourceTypeIcon } from "./source-type-icon";
import { Icon } from "@iconify/react";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function getSourceSubtitle(source: NotebookSourceListItem): string | null {
  const metadata = source.metadata;

  if (source.type === "web" && metadata) {
    if (metadata.description) {
      return metadata.description;
    }

    if (metadata.hostname) {
      return metadata.hostname;
    }

    if (metadata.siteName) {
      return metadata.siteName;
    }
  }

  if (source.type === "youtube" && metadata) {
    if (metadata.channelName) {
      return metadata.channelName;
    }

    if (metadata.durationSeconds) {
      const minutes = Math.floor(metadata.durationSeconds / 60);
      const seconds = metadata.durationSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  return null;
}

function SourceListItem({
  source,
  onToggle,
  onOpen,
}: {
  source: NotebookSourceListItem;
  onToggle: (sourceId: string, isSelected: boolean) => void;
  onOpen: (source: NotebookSourceListItem) => void;
}) {
  const subtitle = getSourceSubtitle(source);
  const isProcessing = source.ingestStatus === "processing";
  const isFailed = source.ingestStatus === "failed";

  if (isProcessing) {
    return (
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2 px-2 py-2">
          <SourceTypeIcon
            type={source.type}
            className="size-5"
            metadata={source.metadata}
          />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm">{source.title}</span>
            <p className="text-muted-foreground text-xs">Indexing source...</p>
          </div>
          <FetchLoader size="sm" className="shrink-0 text-muted-foreground" />
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="flex items-center justify-between gap-2 p-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1">
      <SidebarMenuButton
        tooltip={source.title}
        className="h-auto min-h-8 w-[90%] shrink-0 py-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:min-h-0"
        onClick={() => onOpen(source)}
      >
        <SourceTypeIcon
          type={source.type}
          className="size-5"
          metadata={source.metadata}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{source.title}</span>
          {isFailed ? (
            <span className="block truncate text-destructive text-xs">
              {source.metadata?.ingestError ?? "Indexing failed"}
            </span>
          ) : subtitle ? (
            <span className="block truncate text-muted-foreground text-xs">
              {subtitle}
            </span>
          ) : null}
        </span>
      </SidebarMenuButton>
      <div
        className="group-data-[collapsible=icon]:hidden"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={source.isSelected}
          disabled={isFailed || source.ingestStatus !== "ready"}
          onCheckedChange={(checked) => onToggle(source.id, checked)}
          aria-label={`Toggle ${source.title}`}
        />
      </div>
    </SidebarMenuItem>
  );
}

type SortOption = "recent" | "title" | "type";

export function SourcesPanel({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const openSource = useCitationStore((state) => state.openSource);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const { data: sources = [], isPending } = useNotebookSources(notebookId);
  useResumeSourceIngest(notebookId, sources);
  const updateSelection = useUpdateSourceSelection(notebookId);
  const updateAllSelection = useUpdateAllSourceSelection(notebookId);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const allSelected =
    sources.length > 0 && sources.every((source: NotebookSourceListItem) => source.isSelected);
  const someSelected = sources.some((source: NotebookSourceListItem) => source.isSelected);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const handleSelectAll = () => {
    updateAllSelection.mutate(!allSelected);
  };

  const handleToggle = (sourceId: string, isSelected: boolean) => {
    updateSelection.mutate({ sourceId, isSelected });
  };

  const handleOpenSource = (source: NotebookSourceListItem) => {
    if (source.ingestStatus !== "ready") {
      return;
    }

    openSource(source.id, source.title);
  };

  const openAddSourceModal = () => {
    router.push(`/notebook/${notebookId}?addSource=true`, { scroll: false });
  };

  const sortedSources = [...sources].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "type") {
      return a.type.localeCompare(b.type);
    }
    // "recent" sorts by createdAt descending
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return (
    <>
      <SidebarGroup className="py-0">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              className="flex items-center gap-2 group-data-[collapsible=icon]:bg-transparent! text-white! bg-secondary p-2 rounded-xl cursor-pointer hover:bg-secondary/90 transition-colors"
              onClick={openAddSourceModal}
            >
              <Icon
                icon={"carbon:add-filled"}
                className="shrink-0 size-5 group-data-[collapsible=icon]:size-7 ring-3 ring-muted rounded-full text-primary
              "
              />
              <span className="truncate">Add sources</span>
            </SidebarMenuItem>

            <SidebarAddSourceInput notebookId={notebookId} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isPending ? (
        <SidebarGroup className="flex-1">
          <SidebarGroupContent className="flex items-center justify-center py-8">
            <FetchLoader size="md" className="text-muted-foreground" />
          </SidebarGroupContent>
        </SidebarGroup>
      ) : sources.length === 0 ? (
        <SidebarGroup className="flex-1">
          <SidebarGroupContent className="flex flex-col group-data-[collapsible=icon]:border-t items-center justify-center gap-2 px-2 py-8 text-center">
            <Icon icon="bi:folder-x" className="size-7 text-muted-foreground" />
            <div className="group-data-[collapsible=icon]:hidden flex flex-col items-center justify-center gap-1">
              <p className="font-medium text-sm ">No sources yet</p>
              <p className="text-muted-foreground text-xs">
                Upload a PDF, TXT file, or use Add sources for audio and more.
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : (
        <SidebarGroup className="min-h-0 flex-1">
          <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 hover:bg-background cursor-pointer"
                >
                  <Icon icon="mdi:filter-variant" className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-28">
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(val) => setSortBy(val as SortOption)}
                >
                  <DropdownMenuRadioItem
                    value="recent"
                    className="text-xs cursor-pointer"
                  >
                    Recent
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="title"
                    className="text-xs cursor-pointer"
                  >
                    Title
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="type"
                    className="text-xs cursor-pointer"
                  >
                    Type
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-medium text-muted-foreground">
                Select all
              </span>
              <Checkbox
                ref={selectAllRef}
                checked={allSelected}
                className="shrink-0 size-4 m-0.5"
                onCheckedChange={handleSelectAll}
                aria-label="Select all sources"
              />
            </div>
          </div>
          <SidebarGroupContent className="min-h-0 overflow-y-auto scroll-fade">
            <SidebarMenu>
              {sortedSources.map((source) => (
                <SourceListItem
                  key={source.id}
                  source={source}
                  onToggle={handleToggle}
                  onOpen={handleOpenSource}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}
