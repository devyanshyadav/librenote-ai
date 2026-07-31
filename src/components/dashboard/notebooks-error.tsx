"use client";

import { useNotebooks } from "@/tanstack/queries/notebook.query";

export function NotebooksError() {
  const { isLoading, isError, error } = useNotebooks();

  if (isLoading || !isError) {
    return null;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : "Failed to load notebooks."}
      </p>
    </div>
  );
}
