"use client";

import { ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { type FormEvent, useState } from "react";
import {
  formatStudioArtifactType,
  getStudioArtifactIcon,
} from "@/components/studio/studio-config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StudioArtifactListItem as StudioArtifactListItemType } from "@/types";
import { Badge } from "../ui/badge";

export function StudioArtifactListItem({
  artifact,
  onOpen,
  onDelete,
  onRename,
  isDeleting = false,
  isRenaming = false,
}: {
  artifact: StudioArtifactListItemType;
  onOpen: (artifactId: string) => void;
  onDelete: (artifactId: string) => void;
  onRename: (artifactId: string, title: string) => Promise<void>;
  isDeleting?: boolean;
  isRenaming?: boolean;
}) {
  const iconName = getStudioArtifactIcon(artifact.type);
  const typeLabel = formatStudioArtifactType(artifact.type);
  const { status } = artifact;
  const isProcessing = status === "processing";
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(artifact.title);

  const subtitle = isProcessing
    ? `Generating ${typeLabel}...`
    : isFailed
      ? "Generation failed"
      : typeLabel;

  const handleRename = async (event: FormEvent) => {
    event.preventDefault();
    const title = renameTitle.trim();
    if (!title) return;

    try {
      await onRename(artifact.id, title);
      setIsRenameOpen(false);
    } catch {
      // Error toast is handled by the parent mutation.
    }
  };

  return (
    <>
      <div
        className={cn(
          "group/item flex items-center gap-2 rounded-lg px-2 py-3.5 transition-colors hover:bg-linear-to-r hover:from-muted/80 hover:via-accent/30",
          "group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-10",
        )}
      >
        <button
          type="button"
          onClick={() => isCompleted && onOpen(artifact.id)}
          disabled={!isCompleted}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 text-left",
            !isCompleted && "cursor-default",
            "group-data-[collapsible=icon]:hidden",
          )}
        >
          <Icon
            icon={iconName}
            className="size-5 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{artifact.title}</p>
            <p
              className={cn(
                "truncate text-xs capitalize",
                isFailed ? "text-destructive" : "text-muted-foreground",
              )}
            />
          </div>
        </button>

        <Icon
          icon={iconName}
          className="hidden size-5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:block"
        />

        <div className="relative flex shrink-0 items-center gap-2 pr-0.5 group-data-[collapsible=icon]:hidden">
          <Badge variant={subtitle === "Generation failed" ? "destructive" : "secondary"}>{subtitle}</Badge>
          {isProcessing ? (
            <Icon
              icon="svg-spinners:ring-resize"
              className="size-4 text-muted-foreground"
            />
          ) : isCompleted ? (
            <ChevronRight className="size-4 text-muted-foreground transition-opacity group-hover/item:opacity-0" />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "size-7",
                    !isProcessing &&
                      "absolute right-0 opacity-0 transition-opacity group-hover/item:opacity-100 data-popup-open:opacity-100",
                  )}
                  aria-label="Artifact actions"
                  disabled={isDeleting || isRenaming}
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              {!isProcessing ? (
                <DropdownMenuItem
                  onClick={() => {
                    setRenameTitle(artifact.title);
                    setIsRenameOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(artifact.id)}
                disabled={isDeleting}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename artifact</DialogTitle>
            <DialogDescription>
              Update the display name for this {typeLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              placeholder="Artifact title"
              autoFocus
              maxLength={200}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRenaming || !renameTitle.trim()}
              >
                {isRenaming ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
