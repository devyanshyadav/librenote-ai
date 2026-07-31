"use client";

import { X } from "lucide-react";
import {
  useSourceDetail,
  useNotebookSources,
} from "@/tanstack/queries/source.query";
import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { SourceTypeIcon } from "@/components/notebook/source-type-icon";
import { SourceViewer } from "@/components/notebook/source-viewer";
import { SourcesPanel } from "@/components/notebook/sources-panel";
import {
  StudioPanel,
  StudioArtifactViewHeader,
  StudioArtifactViewPanel,
} from "@/components/studio/studio-panel";
import { useStudioStore } from "@/stores/studio.store";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCitationStore } from "@/stores/citation.store";

function SidebarPanelHeader({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex h-11 items-center justify-between p-2 pr-1">
        <span className="truncate font-semibold text-sm">{title}</span>
        {action ?? <SidebarTrigger className={"mr-2"} />}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SourcePreviewHeader() {
  const { activeSourceId, activeSourceTitle, viewMode, closeSidebar } =
    useCitationStore();
  const { data: source } = useSourceDetail(
    activeSourceId || "",
    !!activeSourceId,
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden p-1.5">
          <SourceTypeIcon
            type={source?.type || ""}
            metadata={source?.metadata}
            className="size-5"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-sm">
              {activeSourceTitle || "Source"}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {viewMode === "citation" ? "Referenced content" : "Source guide"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeSidebar}
            aria-label="Close source preview"
          >
            <X className="size-4" />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function NotebookLeftSidebar({
  notebookId,
  children,
}: {
  notebookId: string;
  children: ReactNode;
}) {
  const isSourceViewOpen = useCitationStore((state) => state.isOpen);
  const { setOpen } = useSidebar();

  useLayoutEffect(() => {
    if (isSourceViewOpen) {
      setOpen(true);
    }
  }, [isSourceViewOpen, setOpen]);

  return (
    <AppSidebar
      side="left"
      header={
        isSourceViewOpen ? (
          <SourcePreviewHeader />
        ) : (
          <SidebarPanelHeader title="Sources" />
        )
      }
      content={
        isSourceViewOpen ? (
          <SourceViewer />
        ) : (
          <SourcesPanel notebookId={notebookId} />
        )
      }
    >
      <SidebarInset className="h-full overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </AppSidebar>
  );
}

import type { NotebookSourceListItem } from "@/types";

export function NotebookRightSidebar({ notebookId }: { notebookId: string }) {
  const { activeArtifactId } = useStudioStore();
  const { data: sources = [] } = useNotebookSources(notebookId);
  const selectedReadyCount = sources.filter(
    (source: NotebookSourceListItem) => source.isSelected && source.ingestStatus === "ready",
  ).length;

  const headerTitle = (
    <div className="flex items-center gap-2 pl-1">
      <span className="font-semibold text-sm">Studio</span>
      {selectedReadyCount > 0 ? (
        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[12px] font-semibold text-primary">
          {selectedReadyCount} source{selectedReadyCount === 1 ? "" : "s"} ready
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold text-muted-foreground">
          0 ready
        </span>
      )}
    </div>
  );

  return (
    <AppSidebar
      side="right"
      collapsible={activeArtifactId ? "none" : "icon"}
      header={
        activeArtifactId ? (
          <StudioArtifactViewHeader notebookId={notebookId} />
        ) : (
          <SidebarPanelHeader title={headerTitle} />
        )
      }
      content={
        activeArtifactId ? (
          <StudioArtifactViewPanel notebookId={notebookId} />
        ) : (
          <StudioPanel notebookId={notebookId} />
        )
      }
    />
  );
}
