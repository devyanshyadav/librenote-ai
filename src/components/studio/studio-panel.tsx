"use client";

import {
  ChevronLeft,
  EllipsisVertical,
  Link2,
  Printer,
  Trash2,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StudioArtifactListItem } from "@/components/studio/studio-artifact-list-item";
import { StudioArtifactViewer } from "@/components/studio/studio-artifact-viewer";
import {
  formatStudioArtifactType,
  getStudioArtifactIcon,
  STUDIO_FEATURES,
} from "@/components/studio/studio-config";
import { StudioFeatureCard } from "@/components/studio/studio-feature-card";
import { StudioGenerateDialog } from "@/components/studio/studio-generate-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { copyArtifactShareUrl } from "@/lib/studio/artifact-share";
import { useStudioStore } from "@/stores/studio.store";
import { useNotebookSources } from "@/tanstack/queries/source.query";
import {
  useCreateStudioNote,
  useDeleteStudioArtifact,
  useGenerateStudioArtifact,
  useRenameStudioArtifact,
  useStudioArtifact,
  useStudioArtifacts,
} from "@/tanstack/queries/studio.query";
import type { NotebookSourceListItem, StudioArtifactListItem as StudioArtifactListItemType, StudioArtifactSlug, StudioGenerateOptions } from "@/types";
import { Badge } from "../ui/badge";

export function StudioPanel({ notebookId }: { notebookId: string }) {
  const { data: sources = [] } = useNotebookSources(notebookId);
  const { data: artifacts = [], isFetching } = useStudioArtifacts(notebookId);
  const generateArtifact = useGenerateStudioArtifact(notebookId);
  const createNote = useCreateStudioNote(notebookId);
  const deleteArtifact = useDeleteStudioArtifact(notebookId);
  const renameArtifact = useRenameStudioArtifact(notebookId);
  const { activeArtifactId, setActiveArtifactId } = useStudioStore();
  const [generateDialogSlug, setGenerateDialogSlug] =
    useState<StudioArtifactSlug | null>(null);
  const processingIdsRef = useRef<Set<string>>(new Set());

  const readySources = useMemo(
    () => sources.filter((source: NotebookSourceListItem) => source.ingestStatus === "ready"),
    [sources],
  );

  const isPolling = artifacts.some(
    (artifact: StudioArtifactListItemType) => artifact.status === "processing",
  );

  useEffect(() => {
    for (const artifact of artifacts as StudioArtifactListItemType[]) {
      if (artifact.status === "processing") {
        processingIdsRef.current.add(artifact.id);
        continue;
      }

      if (
        artifact.status === "completed" &&
        processingIdsRef.current.has(artifact.id)
      ) {
        processingIdsRef.current.delete(artifact.id);
        toast.success(`${artifact.title} is ready`);
        continue;
      }

      if (
        artifact.status === "failed" &&
        processingIdsRef.current.has(artifact.id)
      ) {
        processingIdsRef.current.delete(artifact.id);
        toast.error(`${artifact.title} failed to generate`);
      }
    }
  }, [artifacts]);

  const generatingSlug = generateArtifact.isPending
    ? generateArtifact.variables?.artifactType
    : createNote.isPending
      ? "note"
      : undefined;

  const startGeneration = (
    slug: StudioArtifactSlug,
    sourceIds: string[],
    options?: StudioGenerateOptions,
  ) => {
    generateArtifact.mutate(
      {
        artifactType: slug,
        sourceIds,
        options,
      },
      {
        onSuccess: () => {
          setGenerateDialogSlug(null);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to start generation",
          );
        },
      },
    );
  };

  const handleFeatureClick = (slug: StudioArtifactSlug) => {
    if (slug === "note") {
      createNote.mutate(undefined, {
        onSuccess: (result) => {
          const artifact = result.data;
          if (artifact) {
            setActiveArtifactId(artifact.id);
          }
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to create note",
          );
        },
      });
      return;
    }

    if (readySources.length === 0) {
      toast.error("Add at least one ready source before generating.");
      return;
    }

    setGenerateDialogSlug(slug);
  };

  const handleDeleteArtifact = (artifactId: string) => {
    deleteArtifact.mutate(artifactId, {
      onSuccess: () => {
        if (activeArtifactId === artifactId) {
          setActiveArtifactId(null);
        }
        toast.success("Artifact deleted");
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete artifact",
        );
      },
    });
  };

  const handleRenameArtifact = async (artifactId: string, title: string) => {
    try {
      await renameArtifact.mutateAsync({ artifactId, title });
      toast.success("Artifact renamed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename artifact",
      );
      throw error;
    }
  };

  const pendingDeleteId = deleteArtifact.isPending
    ? deleteArtifact.variables
    : undefined;
  const pendingRenameId = renameArtifact.isPending
    ? renameArtifact.variables?.artifactId
    : undefined;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:items-center">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Create
          </SidebarGroupLabel>
          <SidebarGroupContent className="@container">
            <div className="grid grid-cols-1 @[50px]:grid-cols-2 @[280px]:grid-cols-3 gap-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
              {STUDIO_FEATURES.map((feature) => (
                <StudioFeatureCard
                  key={feature.slug}
                  label={feature.label}
                  icon={feature.icon}
                  className={feature.className}
                  disabled={
                    (feature.slug !== "note" && readySources.length === 0) ||
                    !!generatingSlug
                  }
                  isLoading={generatingSlug === feature.slug}
                  onClick={() => handleFeatureClick(feature.slug)}
                />
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-center w-full gap-2">
              <div className="flex items-center gap-1">
                <span>Generated</span>
                {(isFetching || isPolling) && (
                  <Icon icon="svg-spinners:ring-resize" className="size-3" />
                )}
              </div>
              <div className="h-px bg-sidebar-border/80 my-1 w-full" />
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className=" group-data-[collapsible=icon]:border-t pt-1">
            {artifacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-muted/10 mx-1 group-data-[collapsible=icon]:hidden">
                <Icon
                  icon="solar:ghost-broken"
                  className="size-10 text-muted-foreground/60 mb-2"
                />
                <p className="font-medium text-xs text-foreground">
                  No artifacts generated
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                  Add a note or pick a format above to transform your sources.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 group-data-[collapsible=icon]:gap-2">
                {artifacts.map((artifact: StudioArtifactListItemType) => (
                  <StudioArtifactListItem
                    key={artifact.id}
                    artifact={artifact}
                    onOpen={setActiveArtifactId}
                    onDelete={handleDeleteArtifact}
                    onRename={handleRenameArtifact}
                    isDeleting={pendingDeleteId === artifact.id}
                    isRenaming={pendingRenameId === artifact.id}
                  />
                ))}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </div>

      <StudioGenerateDialog
        open={generateDialogSlug != null}
        onOpenChange={(open) => {
          if (!open) {
            setGenerateDialogSlug(null);
          }
        }}
        artifactSlug={generateDialogSlug}
        sources={readySources}
        isGenerating={
          generateDialogSlug != null && generatingSlug === generateDialogSlug
        }
        onGenerate={({ options, sourceIds }) => {
          if (!generateDialogSlug) {
            return;
          }

          startGeneration(generateDialogSlug, sourceIds, options);
        }}
      />
    </ScrollArea>
  );
}

export function StudioArtifactViewHeader({
  notebookId,
}: {
  notebookId: string;
}) {
  const { activeArtifactId, setActiveArtifactId } = useStudioStore();
  const { data: artifacts = [] } = useStudioArtifacts(notebookId);
  const deleteArtifact = useDeleteStudioArtifact(notebookId);

  const activeListItem = artifacts.find(
    (artifact: StudioArtifactListItemType) => artifact.id === activeArtifactId,
  );

  const handleDelete = async () => {
    if (!activeArtifactId) return;
    try {
      await deleteArtifact.mutateAsync(activeArtifactId);
      setActiveArtifactId(null);
      toast.success("Artifact deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete artifact",
      );
    }
  };

  const handleShare = async () => {
    if (!activeListItem) return;
    try {
      const url = await copyArtifactShareUrl(activeListItem.id);
      toast.success("Share link copied successfully!", {
        description: "You're now ready to share this artifact with others.",
      });
    } catch {
      toast.error("Failed to copy share link");
    }
  };

  if (!activeListItem) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex h-14 items-center gap-2 px-2 py-2 border-b border-sidebar-border w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveArtifactId(null)}
          aria-label="Back to Studio"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <Icon
            icon={getStudioArtifactIcon(activeListItem.type)}
            className="size-5 shrink-0 text-muted-foreground"
          />
          <p className="truncate font-semibold text-sm leading-tight">
            {activeListItem.title}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary">
            {formatStudioArtifactType(activeListItem.type)}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={handleShare} className="gap-2">
                <Link2 className="size-3.5" />
                Share
              </DropdownMenuItem>
              {activeListItem.type === "report" ? (
                <DropdownMenuItem
                  onClick={() => {
                    const printUrl = `/notebook/artifact/${activeListItem.id}?print=1`;
                    if (!window.open(printUrl, "_blank")) {
                      toast.error(
                        "Pop-up blocked. Allow pop-ups to print the report.",
                      );
                    }
                  }}
                  className="gap-2"
                >
                  <Printer className="size-3.5" />
                  Print
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function StudioArtifactViewPanel({
  notebookId,
}: {
  notebookId: string;
}) {
  const { activeArtifactId } = useStudioStore();
  const { data: activeArtifactDetail, isPending: isActiveArtifactPending } =
    useStudioArtifact(activeArtifactId ?? "");
  const { data: sources = [] } = useNotebookSources(notebookId);

  if (isActiveArtifactPending || !activeArtifactDetail) {
    return (
      <div className="flex items-center justify-center py-12 h-full">
        <Icon
          icon="svg-spinners:ring-resize"
          className="size-5 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <StudioArtifactViewer
          artifact={activeArtifactDetail}
          sources={sources}
          notebookId={notebookId}
        />
      </div>
    </ScrollArea>
  );
}
