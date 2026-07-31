"use client";

import { FetchLoader } from "@/components/ui/fetch-loader";
import { useNotebooks } from "@/tanstack/queries/notebook.query";

export function NotebooksLoading() {
  const { isLoading } = useNotebooks();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <FetchLoader size="lg" className="text-muted-foreground" />
    </div>
  );
}
