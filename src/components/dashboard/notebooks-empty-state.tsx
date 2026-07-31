"use client";

import { Icon } from "@iconify/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FetchLoader } from "@/components/ui/fetch-loader";
import { useNotebookCreate } from "@/hooks/use-notebook-create";
import { useNotebooks } from "@/tanstack/queries/notebook.query";

export function NotebooksEmptyState() {
  const { data: notebooks = [], isLoading, isError } = useNotebooks();
  const { isCreating, create } = useNotebookCreate();

  if (isLoading || isError || notebooks.length > 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-border border-dashed bg-linear-to-br from-card/30 via-card/80 to-card/30 p-6 py-20 text-center">
      <div className="rounded-full bg-linear-to-r from-primary/20 to-primary/10 p-4 text-primary">
        <Icon icon="solar:book-broken" className="size-10" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground text-xl">
          No notebooks yet
        </h3>
        <p className="max-w-sm text-muted-foreground text-sm">
          Create a notebook to upload sources, chat with grounded citations, and
          generate studio artifacts — all on your own infrastructure.
        </p>
      </div>
      <Button
        onClick={() => void create()}
        disabled={isCreating}
        size="lg"
        className="gap-2"
        variant="outline"
      >
        {isCreating ? <FetchLoader size="sm" /> : <Plus className="size-4" />}
        Create your first notebook
      </Button>
    </div>
  );
}
