"use client";

import {
  ArrowRight,
  Clock,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/stores";
import {
  useDeleteNotebook,
  useUpdateNotebook,
} from "@/tanstack/queries/notebook.query";
import { cn } from "@/lib/utils";
import type { NotebookListItem } from "@/types";
import { Icon } from "@iconify/react";

export function NotebookCard({ notebook }: { notebook: NotebookListItem }) {
  const router = useRouter();
  const { favorites, toggleFavorite } = useDashboardStore();
  const isFav = favorites.includes(notebook.id);

  const { mutate: deleteNotebook, isPending: isDeleting } = useDeleteNotebook();
  const { mutate: updateNotebook, isPending: isUpdating } = useUpdateNotebook();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(notebook.title);
  const [editDescription, setEditDescription] = useState(
    notebook.description ?? "",
  );

  const openEditDialog = () => {
    setEditTitle(notebook.title);
    setEditDescription(notebook.description ?? "");
    setIsEditDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotebook(notebook.id, {
      onSuccess: () => {
        toast.success("Notebook deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete notebook");
      },
    });
  };

  const handleUpdateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const title = editTitle.trim();
    if (!title) {
      toast.error("Title cannot be empty");
      return;
    }

    updateNotebook(
      {
        id: notebook.id,
        title,
        description: editDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Notebook updated successfully");
          setIsEditDialogOpen(false);
        },
        onError: () => {
          toast.error("Failed to update notebook");
        },
      },
    );
  };

  return (
    <>
      <Card
        className="p-0 gap-0 p-1 relative"
        onClick={() => router.push(`/notebook/${notebook.id}`)}
      >
        <div className="inverted absolute top-1 right-1 bg-muted dark:bg-sidebar-accent! z-10"></div>

        <div className="absolute top-1 right-1 bg-card h-16 grid place-items-center aspect-square pl-4 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={"relative z-20"}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(notebook.id);
                }}
                className="gap-2"
              >
                <Star
                  className={cn("size-4", isFav && "fill-primary text-primary")}
                />
                <span>{isFav ? "Unfavorite" : "Favorite"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog();
                }}
                className="gap-2"
              >
                <Pencil className="size-4" />
                <span>Edit notebook</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardHeader className="flex-1 space-y-1.5 pb-4 rounded-b-3xl p-5 bg-muted dark:bg-sidebar-accent! border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
              <Icon icon={"solar:book-broken"} className="size-5" />
            </div>
          </div>

          <CardTitle className="truncate font-bold text-lg transition-colors group-hover:text-primary">
            {notebook.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
            {notebook.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-xs border-0 bg-transparent text-muted-foreground p-3">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>{new Date(notebook.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            <span>Open</span>
            <ArrowRight className="size-3.5" />
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Edit notebook</DialogTitle>
            <DialogDescription>
              Update the title and description for this notebook.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateNotebook} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`notebook-title-${notebook.id}`}>Title</Label>
              <Input
                id={`notebook-title-${notebook.id}`}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Notebook title..."
                disabled={isUpdating}
                autoFocus
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`notebook-description-${notebook.id}`}>
                Description
              </Label>
              <Textarea
                id={`notebook-description-${notebook.id}`}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this notebook about?"
                disabled={isUpdating}
                rows={3}
                maxLength={500}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
